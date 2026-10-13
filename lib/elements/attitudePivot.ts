// Attitude pivot detector (CoP #12 rotations, table #13 row 12: 3.1203).
//
// Shape, measured so it works from ANY direction while she turns (the 2D knee angle doesn't: facing
// the camera, a bent knee can look straight or folded flat):
//   - free thigh raised (knee height vs hip, as in passe.ts), below back-split height
//   - free foot HIGHER than the free knee: the shin rises behind her (a passé foot hangs at the support knee)
//   - support knee straight
// Rotation: the facing angle (geometry.ts facingAngle) is followed frame by frame while the shape is
// held; the steps add up to the turn. "The amount of rotation is evaluated from the moment that a
// well-defined shape is taken and until the moment the gymnast starts leaving the shape" (#12.2.1).
//
// Only TURNING attitudes are judged here (>= 180°): an attitude held still is a balance (balances.ts).
// The leap detector's "in the air" flag is not used: rising into a pivot can look like a take-off for
// a few frames, and a leap never turns 180° in this shape on a straight support leg.
// Checked on the team's two pivot videos (2026-10-13): 315° and 373° measured, about one turn each.

import {
  LM, LEG_POINTS, angleStep, dist, facingAngle, isOnReleve, jointAngle, legPoints, minVisibility, thighElevation,
  type Landmarks,
} from '../geometry';
import { ATTITUDE_PIVOT, ROTATION_MARGIN_DEG, judgedBand, round2 } from '../rules';
import type { ElementEvent, Penalty } from '../types';
import type { DetectorFrame } from './splitLeap';

export const ATTITUDE_PIVOT_SETTINGS = {
  minVisibility: 0.5,
  minThighDeg: 55, // thigh at least this high (90 = horizontal); lower = a large deviation, not a pivot
  maxThighDeg: 135, // higher = the leg is going up to a back split, not an attitude
  minSupportKneeDeg: 150, // support leg (about) straight
  footAboveKnee: 0.05, // free ankle at least this many shin lengths above the free knee
  gapToleranceMs: 200, // brief tracking glitches don't end the shape
  minTurnDeg: 180, // less turning = an attitude balance, judged by the balance detector
  turningDeg: 90, // after this much turning the balance detector is told she is turning
  closeCallDeg: 45, // rotation within this of 360° gets a "judge should check" warning
};
export type AttitudePivotSettings = typeof ATTITUDE_PIVOT_SETTINGS;

interface PivotSegment {
  tStart: number;
  tLast: number;
  thigh: number[];
  releve: boolean[];
  rotation: number; // signed sum of the facing-angle steps, degrees
  steps: number; // frames after the first one
  lastFacing: number;
  visibility: number;
}

export interface AttitudePivotLive {
  inShape: boolean;
  rotationDeg: number;
  turning: boolean; // in the shape and already turned turningDeg: not a balance
}

export class AttitudePivotDetector {
  private onEvent: (event: ElementEvent) => void;
  private s: AttitudePivotSettings;
  private segment: PivotSegment | null = null;
  live: AttitudePivotLive = { inShape: false, rotationDeg: 0, turning: false };

  constructor(onEvent: (event: ElementEvent) => void, settings = ATTITUDE_PIVOT_SETTINGS) {
    this.onEvent = onEvent;
    this.s = settings;
  }

  reset(): void {
    this.segment = null;
    this.live = { inShape: false, rotationDeg: 0, turning: false };
  }

  update({ t, lm }: DetectorFrame): void {
    const shape = lm && minVisibility(lm, LEG_POINTS) >= this.s.minVisibility
      ? measureAttitudeTurn(lm, this.s)
      : null;

    if (shape?.inShape) {
      const facing = facingAngle(lm!);
      if (!this.segment) {
        this.segment = { tStart: t, tLast: t, thigh: [], releve: [], rotation: 0, steps: 0, lastFacing: facing, visibility: 1 };
      }
      const seg = this.segment;
      seg.rotation += angleStep(seg.lastFacing, facing);
      seg.steps += 1;
      seg.lastFacing = facing;
      seg.tLast = t;
      seg.thigh.push(shape.thighDeg);
      if (shape.releve !== null) seg.releve.push(shape.releve);
      seg.visibility = Math.min(seg.visibility, minVisibility(lm!, LEG_POINTS));
    } else if (this.segment && t - this.segment.tLast > this.s.gapToleranceMs) {
      this.endSegment();
    }

    const rotationDeg = this.segment ? Math.abs(this.segment.rotation) : 0;
    this.live = { inShape: Boolean(this.segment), rotationDeg, turning: rotationDeg >= this.s.turningDeg };
  }

  private endSegment(): void {
    const seg = this.segment!;
    this.segment = null;
    const measured = Math.abs(seg.rotation);
    const event = judgeAttitudePivot({
      tStart: seg.tStart,
      tEnd: seg.tLast,
      thighDeg: median(seg.thigh),
      // Frame-sampling margin (benefit of the doubt, like the 3° camera margin for angles): the shape
      // started up to one frame before its first seen frame and ended up to one frame after its last,
      // so on average one frame's worth of turning is missed. At 15 frames/s that is ~23° per turn.
      rotationDeg: seg.steps ? measured + measured / seg.steps : measured,
      measuredRotationDeg: measured,
      releveShare: seg.releve.length ? seg.releve.filter(Boolean).length / seg.releve.length : null,
      visibility: seg.visibility,
    }, this.s);
    if (event) this.onEvent(event);
  }

  /** Call at the end of a routine so a pivot still going on is judged. */
  flush(): void {
    if (this.segment) this.endSegment();
  }
}

export interface AttitudeTurnShape {
  inShape: boolean;
  thighDeg: number;
  releve: boolean | null;
}

/** Is this frame an attitude, seen from any direction? Exported for tests. */
export function measureAttitudeTurn(lm: Landmarks, s = ATTITUDE_PIVOT_SETTINGS): AttitudeTurnShape {
  // The free leg is the one with the higher knee.
  const leftIsFree = lm[LM.L_KNEE].y < lm[LM.R_KNEE].y;
  const free = legPoints(lm, leftIsFree ? 'L' : 'R');
  const support = legPoints(lm, leftIsFree ? 'R' : 'L');
  // Real thigh/shin length = the longer of the two legs (2D only ever shortens).
  const thighLen = Math.max(dist(free.hip, free.knee), dist(support.hip, support.knee));
  const shinLen = Math.max(dist(free.knee, free.ankle), dist(support.knee, support.ankle));
  const thighDeg = thighElevation(free.hip, free.knee, thighLen);
  const supportStraight = jointAngle(support.hip, support.knee, support.ankle) >= s.minSupportKneeDeg;
  const footAboveKnee = (free.knee.y - free.ankle.y) / shinLen >= s.footAboveKnee;
  return {
    inShape: thighDeg >= s.minThighDeg && thighDeg <= s.maxThighDeg && supportStraight && footAboveKnee,
    thighDeg,
    releve: isOnReleve(support.heel, support.toe, shinLen, 0.12),
  };
}

export interface MeasuredAttitudePivot {
  tStart: number;
  tEnd: number;
  thighDeg: number;
  rotationDeg: number; // with the frame-sampling margin
  measuredRotationDeg?: number; // without it
  releveShare: number | null;
  visibility: number;
}

/** Judges a turning attitude with the Code of Points. null when it turned too little to be a pivot attempt. */
export function judgeAttitudePivot(m: MeasuredAttitudePivot, s = ATTITUDE_PIVOT_SETTINGS): ElementEvent | null {
  if (m.rotationDeg < s.minTurnDeg) return null;
  const rule = ATTITUDE_PIVOT;
  const deviation = judgedBand(rule.requiredThighDeg - m.thighDeg);
  const penalties: Penalty[] = deviation.penalty > 0
    ? [{
      reason: `Thigh below horizontal: ${deviation.band} deviation (measured ${deviation.measuredDeg}°, ${deviation.deg}° after the 3° camera margin)`,
      value: deviation.penalty,
      ref: deviation.ref,
      segment: 'thigh',
      measuredDeg: deviation.measuredDeg,
      band: deviation.band,
    }]
    : [];
  // Benefit of the doubt: a turn within ROTATION_MARGIN_DEG of a full rotation counts (team decision).
  const rotations = Math.floor((m.rotationDeg + ROTATION_MARGIN_DEG) / 360);
  const full = rotations >= 1;
  const creditedByMargin = rotations > Math.floor(m.rotationDeg / 360);
  const value = full ? round2(rule.value + rule.perExtraRotation * (rotations - 1)) : 0;
  const warnings = [
    `Rotation measured from the shoulders and face (about ±45°): ${Math.round(m.measuredRotationDeg ?? m.rotationDeg)}° seen, ${Math.round(m.rotationDeg)}° with one frame of margin`,
    'Trunk and relevé height are not measured during pivots: judges check them',
  ];
  if (Math.abs(m.rotationDeg - 360 * Math.max(1, Math.round(m.rotationDeg / 360))) <= s.closeCallDeg) {
    warnings.push(`Close to a full turn (${Math.round(m.rotationDeg)}°): check this call`);
  }
  if (creditedByMargin) {
    warnings.push(`Counted as ${rotations * 360}° with the ${ROTATION_MARGIN_DEG}° rotation margin (measured ${Math.round(m.rotationDeg)}°)`);
  }
  if (!full) warnings.unshift('Less than the minimum 360° rotation (#12.1.2)');
  if (!rule.verified) warnings.push('DB value awaiting a check against the CoP table (p. 100)');

  return {
    element: full ? `${rule.name} ${rotations * 360}°` : `${rule.name} (under 360°)`,
    code: rule.code,
    box: rule.box,
    t: m.tStart,
    tStart: m.tStart,
    tEnd: m.tEnd,
    dbValid: full && deviation.dbValid,
    dbValue: full && deviation.dbValid ? value : 0,
    penalties,
    measurements: {
      thighDeg: Math.round(m.thighDeg),
      thighDevDeg: deviation.measuredDeg,
      band: deviation.band,
      holdMs: Math.round(m.tEnd - m.tStart),
      rotationDeg: Math.round(m.rotationDeg),
      rotations,
      relevePct: m.releveShare === null ? null : Math.round(m.releveShare * 100),
    },
    confidence: Math.round(m.visibility * 10) / 10,
    warnings,
    requirement: rule.requirement,
    ruleRef: rule.ref,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const k = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[k] : (sorted[k - 1] + sorted[k]) / 2;
}
