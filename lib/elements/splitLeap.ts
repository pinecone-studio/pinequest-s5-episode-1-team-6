// Leap detector: split leap (CoP #8 jumps/leaps, #9 item 21) and stag leap (#9 item 27).
//
// State machine:  GROUNDED --(hips up AND feet off floor)--> AIRBORNE --(feet back down)--> GROUNDED
//
// While airborne we measure the legs every frame. The Code of Points wants the shape "at the highest
// point of the leap", so only frames near the top of the flight count (hips >= 70% of their maximum
// rise). Near the top, each frame is stag-shaped (one knee clearly bent, the other straight) or
// split-shaped (both straight); the majority decides which leap it was. Then the best frame of that
// shape is judged: 180° between the legs (split) or between the front thigh and the back leg (stag).

import {
  LM, LEG_POINTS, legLengthRatios, minVisibility, mid, splitAngle, stagMeasure, torsoLength,
  type Landmarks, type Side,
} from '../geometry';
import { ELEMENTS, judgedBand } from '../rules';
import type { ElementEvent, Penalty } from '../types';

type LeapRule = typeof ELEMENTS.SPLIT_LEAP | typeof ELEMENTS.STAG_LEAP;

// Tunable thresholds, in torso lengths (so they work at any distance from the camera).
export const SPLIT_LEAP_SETTINGS = {
  takeoffHipRise: 0.15, // hips must rise this much above standing height...
  takeoffFootLift: 0.1, // ...and the lowest toe must leave the floor by this much
  landingFootLift: 0.05, // flight ends when the lowest toe is this close to the floor
  minFlightMs: 100,
  maxFlightMs: 1500,
  peakWindow: 0.7, // frames with hip rise >= 70% of max count as "highest point"
  minSplitToCount: 130, // below this the jump is some other shape, not a split leap attempt
  stagMaxBentKnee: 120, // stag: front knee bent at least this much (180 = straight)...
  stagMinStraightKnee: 140, // ...and the back knee about straight
  minStagToCount: 120, // below this (front thigh to back leg) it is not a stag leap attempt
  straightKnee: 140, // split leap: both knees at least this straight
  personSwitch: 0.3, // torso length jumps by 30%: another person (or the gymnast just arrived), relearn the floor
  minVisibility: 0.5,
  // Legs must look full length for the 2D angle to be trusted (see legLengthRatios):
  minLegToTorso: 1.5, // each leg at least 1.5 torso lengths in the image
  minLegBalance: 0.8, // shorter leg at least 80% of the longer one
  baselineAlpha: 0.05, // how fast standing hip height / floor level adapt
};
export type SplitLeapSettings = typeof SPLIT_LEAP_SETTINGS;

/** One video frame as the detectors see it. lm = null when nobody is visible. */
export interface DetectorFrame {
  t: number; // ms
  lm: Landmarks | null;
  airborne?: boolean;
}

interface FlightFrame {
  t: number;
  hipRise: number;
  split: number;
  stag: ReturnType<typeof stagMeasure>;
  visibility: number;
  legRatios: [number, number];
}

interface Flight {
  tStart: number;
  lastSeen: number;
  maxRise: number;
  frames: FlightFrame[];
}

export class SplitLeapDetector {
  private onEvent: (event: ElementEvent) => void;
  private s: SplitLeapSettings;
  private hipBaseY: number | null = null; // standing hip height (pixels)
  private baseTorso = 0; // torso length when the baseline was learned
  private floorY = 0; // floor level = lowest toe while standing (pixels)
  private flight: Flight | null = null; // data for the current jump, null when grounded
  live = { airborne: false, splitDeg: null as number | null };

  /** @param onEvent called with a judged element event */
  constructor(onEvent: (event: ElementEvent) => void, settings = SPLIT_LEAP_SETTINGS) {
    this.onEvent = onEvent;
    this.s = settings;
    this.reset();
  }

  reset(): void {
    this.hipBaseY = null;
    this.floorY = 0;
    this.flight = null;
    this.live = { airborne: false, splitDeg: null };
  }

  update({ t, lm }: DetectorFrame): void {
    const legsVisible = Boolean(lm) && minVisibility(lm!, LEG_POINTS) >= this.s.minVisibility;
    const torso = lm ? torsoLength(lm) : 0;
    if (!lm || !legsVisible || torso < 1) {
      // Lost the gymnast mid-flight for too long: drop the jump.
      if (this.flight && t - this.flight.lastSeen > 500) this.flight = null;
      this.live = { airborne: Boolean(this.flight), splitDeg: null };
      return;
    }

    const hipY = mid(lm[LM.L_HIP], lm[LM.R_HIP]).y;
    const lowestToeY = Math.max(footY(lm, 'L'), footY(lm, 'R')); // y grows downward
    const split = splitAngle(lm);

    // First frame, or another person / the gymnast just walked in (camera picked someone else
    // before): learn standing height and floor level again.
    const switched = this.baseTorso > 0 && Math.abs(torso / this.baseTorso - 1) > this.s.personSwitch;
    if (this.hipBaseY === null || (switched && !this.flight)) {
      this.hipBaseY = hipY;
      this.floorY = lowestToeY;
      this.baseTorso = torso;
    }
    const hipRise = (this.hipBaseY - hipY) / torso;
    const footLift = (this.floorY - lowestToeY) / torso;

    if (!this.flight) {
      if (hipRise > this.s.takeoffHipRise && footLift > this.s.takeoffFootLift) {
        this.flight = { tStart: t, lastSeen: t, maxRise: 0, frames: [] };
      } else {
        // Standing, walking or preparing: slowly track hip height and floor level.
        const a = this.s.baselineAlpha;
        this.hipBaseY += a * (hipY - this.hipBaseY);
        this.floorY += a * (lowestToeY - this.floorY);
        this.baseTorso += a * (torso - this.baseTorso);
      }
    }

    if (this.flight) {
      const f = this.flight;
      f.lastSeen = t;
      f.maxRise = Math.max(f.maxRise, hipRise);
      f.frames.push({
        t, hipRise, split,
        stag: stagMeasure(lm),
        visibility: minVisibility(lm, LEG_POINTS),
        legRatios: legLengthRatios(lm),
      });
      if (footLift < this.s.landingFootLift) {
        this.finishFlight(t);
      }
    }

    this.live = { airborne: Boolean(this.flight), splitDeg: split };
  }

  private finishFlight(tLand: number): void {
    const f = this.flight!;
    this.flight = null;
    const flightMs = tLand - f.tStart;
    if (flightMs < this.s.minFlightMs || flightMs > this.s.maxFlightMs) return;

    // "At the highest point of the leap": only frames near the top of the flight.
    const nearPeak = f.frames.filter((fr) => fr.hipRise >= this.s.peakWindow * f.maxRise);
    if (nearPeak.length === 0) return;

    // Which leap? Majority of the frames near the top.
    const isStag = (fr: FlightFrame) => fr.stag.bentKnee <= this.s.stagMaxBentKnee && fr.stag.otherKnee >= this.s.stagMinStraightKnee;
    const isSplit = (fr: FlightFrame) => fr.stag.bentKnee >= this.s.straightKnee;
    const stagFrames = nearPeak.filter(isStag);
    const splitFrames = nearPeak.filter(isSplit);
    const stag = stagFrames.length > 0 && stagFrames.length >= splitFrames.length;
    const candidates = stag ? stagFrames : splitFrames;
    if (candidates.length === 0) return; // neither shape: some other jump
    const angle = (fr: FlightFrame) => (stag ? fr.stag.split : fr.split);
    const best = candidates.reduce((a, b) => (angle(b) > angle(a) ? b : a));
    if (angle(best) < (stag ? this.s.minStagToCount : this.s.minSplitToCount)) return; // not an attempt

    this.onEvent(judgeLeap({
      rule: stag ? ELEMENTS.STAG_LEAP : ELEMENTS.SPLIT_LEAP,
      tStart: f.tStart,
      tPeak: best.t,
      tEnd: tLand,
      peakSplitDeg: angle(best),
      flightMs,
      visibility: best.visibility,
      sideOn: legsFullLength(best.legRatios, this.s),
    }));
  }
}

export interface MeasuredLeap {
  rule?: LeapRule; // split leap when not given
  tStart: number;
  tPeak: number;
  tEnd: number;
  peakSplitDeg: number;
  flightMs: number;
  visibility: number;
  sideOn: boolean;
}

/** Turns a measured leap into a judged event using the Code of Points. */
export function judgeLeap(m: MeasuredLeap): ElementEvent {
  const RULE = m.rule ?? ELEMENTS.SPLIT_LEAP;
  const isStag = RULE.code === ELEMENTS.STAG_LEAP.code;
  const deviation = judgedBand(RULE.requiredSplitDeg - m.peakSplitDeg);
  const penalties: Penalty[] = deviation.penalty > 0
    ? [{
      reason: `${isStag ? 'Stag' : 'Split'} shape: ${deviation.band} deviation (${deviation.measuredDeg}° short of 180°, ${deviation.deg}° after the 3° camera margin)`,
      value: deviation.penalty,
      ref: deviation.ref,
      segment: isStag ? 'leapStag' : 'leapSplit',
      measuredDeg: deviation.measuredDeg,
      band: deviation.band,
    }]
    : [];
  const warnings: string[] = [];
  if (!m.sideOn) warnings.push('A leg is foreshortened (camera not side-on to the split): angle unreliable');
  if (m.visibility < 0.7) warnings.push('Legs partly hidden: low confidence');
  if (isStag) warnings.push('Front knee "maximally bent, foot close to the thigh" is not measured: judges check it');
  if ('verified' in RULE && !RULE.verified) warnings.push('DB value awaiting a check against the CoP table (p. 80)');

  return {
    element: RULE.name,
    code: RULE.code,
    t: m.tPeak,
    tStart: m.tStart,
    tEnd: m.tEnd,
    dbValid: deviation.dbValid,
    dbValue: deviation.dbValid ? RULE.value : 0,
    penalties,
    measurements: {
      peakSplitDeg: Math.round(m.peakSplitDeg),
      deviationDeg: deviation.measuredDeg,
      band: deviation.band,
      flightMs: Math.round(m.flightMs),
    },
    confidence: round1(m.visibility),
    warnings,
    requirement: 'requirement' in RULE ? RULE.requirement : undefined,
    ruleRef: RULE.ref,
  };
}

/** True when both legs look full length, i.e. the split is side-on to the camera. */
export function legsFullLength(
  [a, b]: [number, number],
  s: Pick<SplitLeapSettings, 'minLegToTorso' | 'minLegBalance'> = SPLIT_LEAP_SETTINGS,
): boolean {
  const shorter = Math.min(a, b);
  const longer = Math.max(a, b);
  return shorter >= s.minLegToTorso && shorter >= s.minLegBalance * longer;
}

/** y of the toes, falling back to the ankle if the toes are not visible. */
function footY(lm: Landmarks, side: Side): number {
  const toe = lm[side === 'L' ? LM.L_FOOT : LM.R_FOOT];
  const ankle = lm[side === 'L' ? LM.L_ANKLE : LM.R_ANKLE];
  return toe && (toe.visibility ?? 0) >= 0.3 ? toe.y : ankle.y;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
