// Passé shape detector: passé BALANCE (CoP #10, #11 item 1) and passé PIVOT (#12, #13 item 1).
//
// Both use the same shape: support leg straight, free thigh raised to horizontal,
// free foot at the height of the support knee. What tells them apart is rotation:
//   - shape held with (almost) no turning     -> balance, needs >= 1 second
//   - shape held while turning >= 360°         -> pivot, +0.10 per extra full turn
//
// Counting turns from a 2D camera: the body looks WIDE when facing toward or away
// from the camera and NARROW when side-on. Each wide<->narrow change is about a
// quarter turn. This ignores left/right label flips, which pose models often make
// when the gymnast's back is to the camera. Accuracy: about ±45° per pivot.

import {
  LM, LEG_POINTS, bodyWidthRatio, dist, isOnReleve, jointAngle, legPoints, minVisibility,
  thighElevation, type Landmarks,
} from '../geometry';
import { ELEMENTS, judgedBand, round2 } from '../rules';
import type { ElementEvent, Penalty } from '../types';
import type { DetectorFrame } from './splitLeap';

export const PASSE_SETTINGS = {
  minVisibility: 0.5,
  minThighDeg: 70, // in shape if thigh within 20° of horizontal (larger = "large deviation")
  minSupportKneeDeg: 150, // support leg (roughly) straight
  freeFootAboveKnee: 0.35, // free ankle within 0.35 shin lengths below the support knee, or higher
  freeShinDrop: 0.5, // free ankle hangs below the free knee (bent knee), unlike a straight leg in a leap
  releveHeelLift: 0.12, // heel above toes by this many shin lengths = on relevé
  releveMinShare: 0.6, // share of frames on relevé to call the balance "on relevé"
  gapToleranceMs: 150, // brief tracking glitches don't end the shape
  minBalanceMs: 300, // shorter than this = a passing movement, not a balance attempt
  narrowWidth: 0.4, // body width below 40% of the widest seen = side-on
  wideWidth: 0.7, // above 70% = facing toward/away from camera
};
export type PasseSettings = typeof PASSE_SETTINGS;

type WidthState = 'wide' | 'narrow' | null;

interface PasseSegment {
  tStart: number;
  tLast: number;
  thigh: number[];
  releve: boolean[];
  quarterTurns: number;
  widthState: WidthState;
  visibility: number;
}

export interface PasseLive {
  inShape: boolean;
  thighDeg: number | null;
  releve: boolean | null;
  rotationDeg: number;
}

export class PasseDetector {
  private onEvent: (event: ElementEvent) => void;
  private s: PasseSettings;
  private maxWidth = 0; // widest body width ratio seen (facing the camera)
  private widthState: WidthState = null;
  private segment: PasseSegment | null = null; // current passé shape, null when not in shape
  live: PasseLive = { inShape: false, thighDeg: null, releve: null, rotationDeg: 0 };

  constructor(onEvent: (event: ElementEvent) => void, settings = PASSE_SETTINGS) {
    this.onEvent = onEvent;
    this.s = settings;
    this.reset();
  }

  reset(): void {
    this.maxWidth = 0;
    this.widthState = null;
    this.segment = null;
    this.live = { inShape: false, thighDeg: null, releve: null, rotationDeg: 0 };
  }

  update({ t, lm, airborne = false }: DetectorFrame): void {
    if (!lm || airborne || minVisibility(lm, LEG_POINTS) < this.s.minVisibility) {
      this.maybeEndSegment(t);
      this.live = { ...this.live, inShape: false, thighDeg: null };
      return;
    }

    const shape = measurePasse(lm, this.s);
    this.trackRotation(lm);

    if (shape.inShape) {
      if (!this.segment) {
        this.segment = {
          tStart: t, tLast: t, thigh: [], releve: [], quarterTurns: 0,
          widthState: this.widthState, visibility: 1,
        };
      }
      const seg = this.segment;
      seg.tLast = t;
      seg.thigh.push(shape.thighDeg);
      if (shape.releve !== null) seg.releve.push(shape.releve);
      seg.visibility = Math.min(seg.visibility, minVisibility(lm, LEG_POINTS));
      if (this.widthState && seg.widthState && this.widthState !== seg.widthState) {
        seg.quarterTurns += 1;
      }
      seg.widthState = this.widthState;
    } else {
      this.maybeEndSegment(t);
    }

    this.live = {
      inShape: Boolean(this.segment),
      thighDeg: shape.thighDeg,
      releve: shape.releve,
      rotationDeg: this.segment ? this.segment.quarterTurns * 90 : 0,
    };
  }

  /** Updates wide/narrow state with hysteresis, so small sways don't count as turns. */
  private trackRotation(lm: Landmarks): void {
    const width = bodyWidthRatio(lm);
    this.maxWidth = Math.max(this.maxWidth, width);
    if (this.maxWidth <= 0) return;
    const rel = width / this.maxWidth;
    if (rel < this.s.narrowWidth) this.widthState = 'narrow';
    else if (rel > this.s.wideWidth) this.widthState = 'wide';
  }

  private maybeEndSegment(t: number): void {
    const seg = this.segment;
    if (!seg || t - seg.tLast <= this.s.gapToleranceMs) return;
    this.segment = null;
    const event = classifyPasse({
      tStart: seg.tStart,
      tEnd: seg.tLast,
      thighDeg: median(seg.thigh),
      releveShare: seg.releve.length
        ? seg.releve.filter(Boolean).length / seg.releve.length
        : null,
      rotationDeg: seg.quarterTurns * 90,
      visibility: seg.visibility,
    }, this.s);
    if (event) this.onEvent(event);
  }

  /** Call at the end of a routine so a shape still being held is judged. */
  flush(): void {
    this.maybeEndSegment(Infinity);
  }
}

export interface PasseShape {
  inShape: boolean;
  thighDeg: number;
  supportKneeDeg: number;
  releve: boolean | null;
}

/** Measures the passé shape on one frame. Exported for tests and the live readout. */
export function measurePasse(lm: Landmarks, s = PASSE_SETTINGS): PasseShape {
  // The free leg is the one with the higher knee (smaller y).
  const leftIsFree = lm[LM.L_KNEE].y < lm[LM.R_KNEE].y;
  const free = legPoints(lm, leftIsFree ? 'L' : 'R');
  const support = legPoints(lm, leftIsFree ? 'R' : 'L');

  // Real thigh/shin length = the longer of the two legs (2D only ever shortens).
  const thighLen = Math.max(dist(free.hip, free.knee), dist(support.hip, support.knee));
  const shinLen = Math.max(dist(free.knee, free.ankle), dist(support.knee, support.ankle));

  const thighDeg = thighElevation(free.hip, free.knee, thighLen);
  const supportKneeDeg = jointAngle(support.hip, support.knee, support.ankle);
  const freeFootHigh = free.ankle.y < support.knee.y + s.freeFootAboveKnee * shinLen;
  const freeKneeBent = free.ankle.y - free.knee.y > s.freeShinDrop * shinLen;

  const releve = isOnReleve(support.heel, support.toe, shinLen, s.releveHeelLift);

  const inShape = thighDeg >= s.minThighDeg
    && supportKneeDeg >= s.minSupportKneeDeg
    && freeFootHigh
    && freeKneeBent;

  return { inShape, thighDeg, supportKneeDeg, releve };
}

export interface MeasuredPasse {
  tStart: number;
  tEnd: number;
  thighDeg: number;
  releveShare: number | null;
  rotationDeg: number;
  visibility: number;
}

/** Decides balance vs pivot vs nothing, and judges it with the Code of Points. */
export function classifyPasse(m: MeasuredPasse, s = PASSE_SETTINGS): ElementEvent | null {
  const durationMs = m.tEnd - m.tStart;
  const deviation = judgedBand(90 - m.thighDeg);
  const shapePenalty: Penalty[] = deviation.penalty > 0
    ? [{
      reason: `Passé shape: ${deviation.band} deviation (thigh ${deviation.measuredDeg}° below horizontal, ${deviation.deg}° after the 3° camera margin)`,
      value: deviation.penalty,
      ref: deviation.ref,
      segment: 'passeThigh',
      measuredDeg: deviation.measuredDeg,
      band: deviation.band,
    }]
    : [];
  const measurements = {
    thighDeg: Math.round(m.thighDeg),
    deviationDeg: deviation.measuredDeg,
    band: deviation.band,
    holdMs: Math.round(durationMs),
    rotationDeg: m.rotationDeg,
  };
  const base = { t: m.tStart, tStart: m.tStart, tEnd: m.tEnd, confidence: round1(m.visibility) };

  // --- Pivot: at least one full turn in the shape ---
  if (m.rotationDeg >= ELEMENTS.PASSE_PIVOT.baseRotationDeg) {
    const rule = ELEMENTS.PASSE_PIVOT;
    const rotations = Math.floor(m.rotationDeg / 360);
    const value = round2(rule.value + rule.perExtraRotation * (rotations - 1));
    return {
      ...base,
      element: `${rule.name} ${rotations * 360}°`,
      code: rule.code,
      dbValid: deviation.dbValid,
      dbValue: deviation.dbValid ? value : 0,
      penalties: shapePenalty,
      measurements: { ...measurements, rotations },
      warnings: ['Rotation counted from body width (±45°); relevé not checked during pivots'],
      ruleRef: rule.ref,
    };
  }

  // --- Started turning but < 360°: pivot not valid (#12.1.2 minimum basic rotation) ---
  if (m.rotationDeg >= 180) {
    const rule = ELEMENTS.PASSE_PIVOT;
    return {
      ...base,
      element: `${rule.name} (under 360°)`,
      code: rule.code,
      dbValid: false,
      dbValue: 0,
      penalties: shapePenalty,
      measurements,
      warnings: ['Less than the minimum 360° rotation (#12.1.2)'],
      ruleRef: rule.ref,
    };
  }

  // --- Balance: shape held without turning ---
  if (durationMs < s.minBalanceMs) return null; // passing movement, not an attempt
  const rule = ELEMENTS.PASSE_BALANCE;
  const penalties = [...shapePenalty];
  if (durationMs < rule.minHoldMs) {
    penalties.push({
      reason: `Shape not held for a minimum 1 second (${(durationMs / 1000).toFixed(1)} s)`,
      value: rule.shortHoldPenalty,
      ref: '#10.2.2 p.84',
      segment: 'hold',
      holdMs: Math.round(durationMs),
    });
  }
  const warnings: string[] = [];
  let value = rule.value;
  if (m.releveShare === null) {
    warnings.push('Feet not visible: relevé not verified');
  } else if (m.releveShare < s.releveMinShare) {
    value = round2(value - rule.flatFootReduction);
    warnings.push('On flat foot: value reduced by 0.10 (#10.3)');
  }
  return {
    ...base,
    element: rule.name,
    code: rule.code,
    dbValid: deviation.dbValid && value > 0,
    dbValue: deviation.dbValid ? value : 0,
    penalties,
    measurements: {
      ...measurements,
      relevePct: m.releveShare === null ? null : Math.round(m.releveShare * 100),
    },
    warnings,
    ruleRef: rule.ref,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
