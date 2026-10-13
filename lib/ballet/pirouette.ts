// Pirouette detector: a turn in retiré (toe at the standing knee) on demi-pointe.
//
// Built like the attitude pivot (lib/elements/attitudePivot.ts). The retiré shape is measured with
// VERTICAL distances only, which a turn doesn't change (the 2D knee angle does: from the front a
// turned-out retiré looks folded, from the side almost straight):
//   - working thigh raised (knee height vs hip)
//   - working foot at the height of the standing knee (not hanging lower: that is a coupé)
//   - standing knee straight
// The facing angle (geometry.ts facingAngle) is followed frame by frame while the shape is held; the
// steps add up to the turn, with one frame of sampling margin as for the attitude pivot.
// Judged with the ballet rubric (#B5 foot, #B8 full turn and demi-pointe). Each full turn counts.

import {
  LM, LEG_POINTS, angleStep, dist, facingAngle, isOnReleve, jointAngle, legPoints, minVisibility, thighElevation,
  type Landmarks,
} from '../geometry';
import { round2 } from '../rules';
import type { ElementEvent, Penalty } from '../types';
import type { DetectorFrame } from '../elements/splitLeap';
import { BALLET_LIMITS, BALLET_MOVES, retireFootPenalty } from './rules';

export const PIROUETTE_SETTINGS = {
  minVisibility: 0.5,
  minThighDeg: 30, // working thigh at least this high (a turned-out retiré seen from the side is low)
  maxThighDeg: 110, // higher = an attitude or a développé, not a retiré
  minSupportKneeDeg: 150,
  footNearKnee: [-0.35, 0.6] as [number, number], // working ankle from 0.35 shin above to 0.6 below the standing knee
  gapToleranceMs: 200,
  minTurnDeg: 180, // less turning = a retiré balance, judged by the pose detector
  turningDeg: 90, // after this much turning the pose detector is told she is turning
};
export type PirouetteSettings = typeof PIROUETTE_SETTINGS;

interface Turn {
  tStart: number;
  tLast: number;
  footBelowKnee: number[];
  releve: boolean[];
  rotation: number;
  steps: number;
  lastFacing: number;
  visibility: number;
}

export interface PirouetteLive {
  inShape: boolean;
  rotationDeg: number;
  turning: boolean;
}

export class PirouetteDetector {
  private onEvent: (event: ElementEvent) => void;
  private s: PirouetteSettings;
  private turn: Turn | null = null;
  live: PirouetteLive = { inShape: false, rotationDeg: 0, turning: false };

  constructor(onEvent: (event: ElementEvent) => void, settings = PIROUETTE_SETTINGS) {
    this.onEvent = onEvent;
    this.s = settings;
  }

  reset(): void {
    this.turn = null;
    this.live = { inShape: false, rotationDeg: 0, turning: false };
  }

  /** Judge a pirouette still going on (Finish pressed). */
  flush(): void {
    if (this.turn) this.end();
  }

  update({ t, lm }: DetectorFrame): void {
    const shape = lm && minVisibility(lm, LEG_POINTS) >= this.s.minVisibility ? measureRetireTurn(lm, this.s) : null;
    if (shape?.inShape) {
      const facing = facingAngle(lm!);
      this.turn ??= { tStart: t, tLast: t, footBelowKnee: [], releve: [], rotation: 0, steps: 0, lastFacing: facing, visibility: 1 };
      const turn = this.turn;
      turn.rotation += angleStep(turn.lastFacing, facing);
      turn.steps += 1;
      turn.lastFacing = facing;
      turn.tLast = t;
      turn.footBelowKnee.push(shape.footBelowKnee);
      if (shape.releve !== null) turn.releve.push(shape.releve);
      turn.visibility = Math.min(turn.visibility, minVisibility(lm!, LEG_POINTS));
    } else if (this.turn && t - this.turn.tLast > this.s.gapToleranceMs) {
      this.end();
    }
    const rotationDeg = this.turn ? Math.abs(this.turn.rotation) : 0;
    this.live = { inShape: Boolean(this.turn), rotationDeg, turning: rotationDeg >= this.s.turningDeg };
  }

  private end(): void {
    const turn = this.turn!;
    this.turn = null;
    const measured = Math.abs(turn.rotation);
    const event = judgePirouette({
      tStart: turn.tStart,
      tEnd: turn.tLast,
      // Frame-sampling margin, as for the attitude pivot: about one frame of turning is missed.
      rotationDeg: turn.steps ? measured + measured / turn.steps : measured,
      measuredRotationDeg: measured,
      footBelowKneePct: median(turn.footBelowKnee) * 100,
      releveShare: turn.releve.length ? turn.releve.filter(Boolean).length / turn.releve.length : null,
      visibility: turn.visibility,
    }, this.s);
    if (event) this.onEvent(event);
  }
}

export interface RetireTurnShape {
  inShape: boolean;
  footBelowKnee: number; // working ankle below the standing knee, shin lengths
  releve: boolean | null;
}

/** Is this frame a retiré, seen from any direction? Exported for tests. */
export function measureRetireTurn(lm: Landmarks, s = PIROUETTE_SETTINGS): RetireTurnShape {
  // The working leg is the one with the higher knee.
  const leftWorks = lm[LM.L_KNEE].y < lm[LM.R_KNEE].y;
  const free = legPoints(lm, leftWorks ? 'L' : 'R');
  const support = legPoints(lm, leftWorks ? 'R' : 'L');
  const thighLen = Math.max(dist(free.hip, free.knee), dist(support.hip, support.knee));
  const shinLen = Math.max(dist(free.knee, free.ankle), dist(support.knee, support.ankle));
  const thighDeg = thighElevation(free.hip, free.knee, thighLen);
  const footBelowKnee = (free.ankle.y - support.knee.y) / shinLen;
  const [high, low] = s.footNearKnee;
  const supportStraight = jointAngle(support.hip, support.knee, support.ankle) >= s.minSupportKneeDeg;
  return {
    inShape: thighDeg >= s.minThighDeg && thighDeg <= s.maxThighDeg && supportStraight && footBelowKnee >= high && footBelowKnee <= low,
    footBelowKnee,
    releve: isOnReleve(support.heel, support.toe, shinLen, 0.12),
  };
}

export interface MeasuredPirouette {
  tStart: number;
  tEnd: number;
  rotationDeg: number; // with the frame-sampling margin
  measuredRotationDeg?: number;
  footBelowKneePct: number;
  releveShare: number | null;
  visibility: number;
}

/** Judges a pirouette with the ballet rubric. null when it turned too little to be a pirouette attempt. */
export function judgePirouette(m: MeasuredPirouette, s = PIROUETTE_SETTINGS): ElementEvent | null {
  if (m.rotationDeg < s.minTurnDeg) return null;
  const rule = BALLET_MOVES.PIROUETTE;
  const turns = Math.floor(m.rotationDeg / 360);
  const full = turns >= 1;
  const penalties: Penalty[] = [];
  if (!full) {
    penalties.push({
      reason: `Less than one full turn (${Math.round(m.rotationDeg)}°)`,
      value: BALLET_LIMITS.incompleteTurnPenalty, ref: '#B8 Ballet rubric', segment: 'turnShort', measuredDeg: Math.round(360 - m.rotationDeg),
    });
  }
  const pct = Math.max(0, Math.round(m.footBelowKneePct));
  const footPenalty = retireFootPenalty(pct);
  if (footPenalty > 0) {
    penalties.push({
      reason: `Retiré foot ${pct}% of a shin length below the knee during the turn`,
      value: footPenalty, ref: '#B5 Ballet rubric', segment: 'retireFoot', measuredDeg: pct,
    });
  }
  const flat = m.releveShare !== null && m.releveShare < BALLET_LIMITS.releveMinShare;
  if (flat) {
    penalties.push({
      reason: `Turned on a flat foot (on demi-pointe ${Math.round(m.releveShare! * 100)}% of the turn)`,
      value: BALLET_LIMITS.flatTurnPenalty, ref: '#B8 Ballet rubric', segment: 'flatTurn',
    });
  }
  const warnings = [
    `Rotation measured from the shoulders and face (about ±45°): ${Math.round(m.measuredRotationDeg ?? m.rotationDeg)}° seen, ${Math.round(m.rotationDeg)}° with one frame of margin`,
    'Spotting, the arms and the landing are not measured: the teacher checks them',
    'Rubric values not yet checked by a ballet teacher',
  ];
  if (m.releveShare === null) warnings.unshift('Feet not visible: demi-pointe not verified');
  return {
    element: full ? `${rule.name}, ${turns} turn${turns > 1 ? 's' : ''}` : `${rule.name} (under 1 turn)`,
    code: rule.code,
    t: m.tStart,
    tStart: m.tStart,
    tEnd: m.tEnd,
    dbValid: full,
    dbValue: full ? round2(rule.value + rule.perExtraTurn * (turns - 1)) : 0,
    penalties,
    measurements: {
      holdMs: Math.round(m.tEnd - m.tStart),
      rotationDeg: Math.round(m.rotationDeg),
      rotations: turns,
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
