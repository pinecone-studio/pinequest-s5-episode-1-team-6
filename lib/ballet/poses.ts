// Ballet pose detector: arabesque, attitude, développé devant, à la seconde, retiré and plié.
//
// Two separate questions per frame, as for the gymnastics balances (lib/elements/balances.ts):
//   1. WHICH pose is this?  The ballet pose library (library.ts) compares the frame's signature with
//      many examples; until it knows enough examples, fixed rules (rulePose below) decide.
//   2. HOW FAR from the pose?  Always measured with geometry (degrees, or % of a shin for the retiré
//      foot), so every deduction can be explained with the rubric (rules.ts).
//
// While the same pose is held its measurements are collected; when the dancer leaves it, the pose is
// judged once on the medians: leg height (#B1), straight legs (#B2), trunk (#B3), held 1 s (#B4),
// retiré foot (#B5), even plié (#B6). A plié is a movement, not a balance: no hold time.
//
// Camera: arabesque, attitude, développé and a side retiré from the side; à la seconde, plié and a
// front retiré from the front. A pose turning in retiré is a pirouette (pirouette.ts), not a balance.
//
// Not judged (checked on the team's gymnastics videos, 2026-10-14, see docs/ballet.md):
//   - a leg held up with the hand, seen from the side: a stretch, not an unsupported extension (front
//     split with help). Not checked from the front, where the arm in second position looks the same;
//   - a plié seen from the side: whether the knees bend evenly can only be seen from the front
//     (the side-on fourth-position preparation before a pirouette);
//   - a pose that turns more than 90° while held: a turn, not a balance (a turn in attitude);
//   - a pose held under 0.7 s: a movement passing through it, e.g. on the way into a penché or the
//     plié before a pirouette.

import { LEG_POINTS, angleStep, facingAngle, minVisibility, type Landmarks } from '../geometry';
import { legsUsable } from '../elements/balanceFrame';
import type { PoseLibrary } from '../library/recognizer';
import type { ElementEvent, Measurements, Penalty } from '../types';
import type { DetectorFrame } from '../elements/splitLeap';
import { balletFrame, balletSignature, type BalletFrame } from './frame';
import { BALLET_LABELS, type BalletLabel, type BalletPose } from './library';
import { BALLET_LIMITS, BALLET_POSES, balletBand, retireFootPenalty, type BalletElementRule } from './rules';

export const BALLET_POSE_SETTINGS = {
  // Fixed recognition rules (used until the library knows every pose).
  minLift: 0.15, // free foot off the floor (leg lengths) for a raised-leg pose; a tendu is about 0.1
  plieMaxLift: 0.08, // both feet down for a plié
  plieMaxKnee: 160, // plié: both knees bent at least this much...
  plieDeepKnee: 150, // ...and one of them clearly
  minSupportKnee: 140, // standing on a (fairly) straight leg for a raised-leg pose
  straightLeg: 140, // free knee at least this straight: arabesque, devant, seconde
  attitudeKnee: [60, 140] as [number, number], // attitude free knee bent between these
  retireMaxKnee: 110, // retiré free knee folded at least this much
  retireFoot: [-0.35, 0.6] as [number, number], // free foot from 0.35 shin above to 0.6 below the standing knee
  minLegUp: 45, // an extension at least this high to be recognized (lower = a large deviation still judged)
  maxArabesqueLegUp: 145, // higher (with the trunk down) = penché / back split, not judged here
  minAttitudeThigh: 45,
  minSecondeSideways: 0.35, // à la seconde: the foot well out to the side
  maxTrunk: 60, // more lean = another pose (penché, a bow)
  // Holding
  maxTurnDeg: 90, // a hold that turns more than this is a turn, not a balance
  switchAfterMs: 250, // another pose must last this long before the hold switches to it
  gapToleranceMs: 400, // tracking dropouts up to 0.4 s don't end the hold
};
export type BalletPoseSettings = typeof BALLET_POSE_SETTINGS;

const RULES: Record<BalletPose, BalletElementRule> = {
  arabesque: BALLET_POSES.ARABESQUE,
  attitude: BALLET_POSES.ATTITUDE,
  devant: BALLET_POSES.DEVANT,
  seconde: BALLET_POSES.SECONDE,
  retire: BALLET_POSES.RETIRE,
  plie: BALLET_POSES.PLIE,
};

// The ballet library used for recognition (set by the app; tests pass their own).
let activeLibrary: PoseLibrary<BalletLabel> | null = null;
export function setBalletLibrary(library: PoseLibrary<BalletLabel> | null): void {
  activeLibrary = library;
}

/** Does this library know every ballet pose (and 'none') well enough to decide on its own? */
export function balletLibraryReady(library: PoseLibrary<BalletLabel> | null | undefined): library is PoseLibrary<BalletLabel> {
  return Boolean(library) && BALLET_LABELS.every((p) => library!.knows(p));
}

/** Fixed thresholds, used until the pose library has enough examples. */
export function rulePose(f: BalletFrame, s = BALLET_POSE_SETTINGS): BalletPose | null {
  if (f.trunk > s.maxTrunk) return null;
  if (f.lift <= s.plieMaxLift) {
    const bothBent = Math.max(f.freeKnee, f.supportKnee) <= s.plieMaxKnee && f.bothKneesMin <= s.plieDeepKnee;
    return bothBent ? 'plie' : null;
  }
  if (f.lift < s.minLift || f.supportKnee < s.minSupportKnee) return null;
  const [footHigh, footLow] = s.retireFoot;
  if (f.freeKnee <= s.retireMaxKnee && f.footBelowKnee >= footHigh && f.footBelowKnee <= footLow) return 'retire';
  const straight = f.freeKnee >= s.straightLeg;
  if (f.frontView) {
    return straight && f.sideways >= s.minSecondeSideways && f.legUp >= s.minLegUp ? 'seconde' : null;
  }
  if (f.forward === null) return null;
  if (f.forward) return straight && f.legUp >= s.minLegUp ? 'devant' : null;
  if (straight) return f.legUp >= s.minLegUp && f.legUp <= s.maxArabesqueLegUp ? 'arabesque' : null;
  const [kneeMin, kneeMax] = s.attitudeKnee;
  return f.freeKnee >= kneeMin && f.freeKnee <= kneeMax && f.thighDeg >= s.minAttitudeThigh ? 'attitude' : null;
}

/** The numbers judged for a pose, from one frame (a hold is judged on their medians). */
export interface PoseValues {
  legHeight?: number; // working leg (thigh in attitude) from straight down, degrees: 90 = level
  workingKnee?: number; // 180 = straight
  supportKnee?: number;
  trunk: number; // degrees from upright
  footBelowKneePct?: number; // retiré: % of a shin length below the knee (negative = above)
  kneeGap?: number; // plié: difference between the knees
  deepestKnee?: number; // plié: the more bent knee
}

/** What to measure for each pose. */
export function poseValues(pose: BalletPose, f: BalletFrame): PoseValues {
  const trunk = f.trunk;
  switch (pose) {
    case 'arabesque':
    case 'devant':
    case 'seconde':
      return { legHeight: f.legUp, workingKnee: f.freeKnee, supportKnee: f.supportKnee, trunk };
    case 'attitude':
      return { legHeight: f.thighDeg, supportKnee: f.supportKnee, trunk };
    case 'retire':
      return { footBelowKneePct: f.footBelowKnee * 100, supportKnee: f.supportKnee, trunk };
    case 'plie':
      return { kneeGap: f.kneeGap, deepestKnee: f.bothKneesMin, trunk };
  }
}

/** Rubric deductions for a pose's values (no hold time: that needs the whole hold). */
export function posePenalties(pose: BalletPose, v: PoseValues): Penalty[] {
  const penalties: Penalty[] = [];
  if (v.legHeight !== undefined) {
    const band = balletBand(BALLET_LIMITS.extensionDeg - v.legHeight);
    if (band.penalty > 0) {
      penalties.push({
        reason: `${pose === 'attitude' ? 'Thigh' : 'Working leg'} ${band.measuredDeg}° below 90° (${band.deg}° after the 3° camera margin)`,
        value: band.penalty, ref: '#B1 Ballet rubric', segment: 'legHeight', measuredDeg: band.measuredDeg, band: band.band,
      });
    }
  }
  for (const [key, segment, what] of [['workingKnee', 'workingKnee', 'Working'], ['supportKnee', 'supportKnee', 'Standing']] as const) {
    const knee = v[key];
    if (knee !== undefined && knee < BALLET_LIMITS.straightKneeDeg) {
      penalties.push({
        reason: `${what} leg bent: knee at ${Math.round(knee)}° (straight = 180°)`,
        value: BALLET_LIMITS.bentLegPenalty, ref: '#B2 Ballet rubric', segment, measuredDeg: Math.round(180 - knee),
      });
    }
  }
  const allowance = BALLET_LIMITS.trunkAllowanceDeg[pose];
  const trunk = balletBand(v.trunk - allowance);
  if (trunk.penalty > 0) {
    penalties.push({
      reason: `Trunk ${Math.round(v.trunk)}° from upright, ${trunk.measuredDeg}° more than the ${allowance}° allowed (${trunk.deg}° after the 3° camera margin)`,
      value: trunk.penalty, ref: '#B3 Ballet rubric', segment: 'balletTrunk', measuredDeg: trunk.measuredDeg, band: trunk.band,
    });
  }
  if (v.footBelowKneePct !== undefined) {
    const pct = Math.max(0, Math.round(v.footBelowKneePct));
    const value = retireFootPenalty(pct);
    if (value > 0) {
      penalties.push({
        reason: `Retiré foot ${pct}% of a shin length below the knee`,
        value, ref: '#B5 Ballet rubric', segment: 'retireFoot', measuredDeg: pct,
      });
    }
  }
  if (v.kneeGap !== undefined) {
    const gap = Math.round(v.kneeGap);
    if (gap - 3 > BALLET_LIMITS.uneven.toleranceDeg) {
      penalties.push({
        reason: `Knees bent unevenly: ${gap}° apart`,
        value: BALLET_LIMITS.uneven.penalty, ref: '#B6 Ballet rubric', segment: 'kneesUneven', measuredDeg: gap,
      });
    }
  }
  return penalties;
}

export interface BalletPoseMeasurement {
  pose: BalletPose | null;
  values: PoseValues | null;
  releve: boolean | null;
  hint: string | null;
  recognizer: 'library' | 'rules';
  confidence: number | null;
}

/**
 * Which ballet pose is shown in this frame, and its values. Exported for tests and tools.
 * @param library a ballet PoseLibrary, or null to use only the fixed rules
 */
export function measureBalletPose(
  lm: Landmarks, library: PoseLibrary<BalletLabel> | null = activeLibrary, s = BALLET_POSE_SETTINGS,
): BalletPoseMeasurement {
  const f = balletFrame(lm);
  const none = { pose: null, values: null, releve: null, confidence: null };
  if (!f) return { ...none, hint: 'Step into the camera view', recognizer: 'rules' };
  let pose: BalletPose | null;
  let recognizer: 'library' | 'rules' = 'rules';
  let confidence: number | null = null;
  if (balletLibraryReady(library)) {
    const r = library.recognize(balletSignature(f));
    pose = r.pose as BalletPose | null;
    recognizer = 'library';
    confidence = r.confidence;
  } else {
    pose = rulePose(f, s);
  }
  // Things that look like a pose but are not judged as one (see the top of this file).
  // Hand on the leg, from the side only: from the front, an arm in second position is right above an
  // à la seconde leg and looks like it holds it.
  if (f.help && !f.frontView && pose !== 'retire' && pose !== 'plie') pose = null;
  if (pose === 'plie' && !f.frontView) return { ...none, hint: 'Face the camera for pliés', recognizer };
  if (!pose) return { ...none, hint: f.lift >= s.minLift && !f.frontView && f.forward === null ? 'Turn side-on to the camera' : null, recognizer };
  return { pose, values: poseValues(pose, f), releve: f.releve, hint: null, recognizer, confidence };
}

export interface BalletPoseLive {
  pose: BalletPose | null;
  holdMs: number;
  penalties: Penalty[];
  hint: string | null;
}

interface Hold {
  pose: BalletPose;
  tStart: number;
  tLast: number;
  rotation: number; // degrees turned while held (facing angle steps)
  lastFacing: number | null;
  values: PoseValues[];
  releve: boolean[];
  visibility: number;
  recognizer: string;
}

export class BalletPoseDetector {
  private onEvent: (event: ElementEvent) => void;
  private s: BalletPoseSettings;
  /** undefined = use the active library; null = fixed rules only. */
  library: PoseLibrary<BalletLabel> | null | undefined = undefined;
  private hold: Hold | null = null;
  private candidate: Hold | null = null; // another pose seen during a hold, not yet long enough to switch
  live: BalletPoseLive = { pose: null, holdMs: 0, penalties: [], hint: null };

  constructor(onEvent: (event: ElementEvent) => void, settings = BALLET_POSE_SETTINGS) {
    this.onEvent = onEvent;
    this.s = settings;
  }

  reset(): void {
    this.hold = null;
    this.candidate = null;
    this.live = { pose: null, holdMs: 0, penalties: [], hint: null };
  }

  /** Judge a pose still being held (Finish pressed). */
  flush(): void {
    if (this.hold) this.end();
  }

  update({ t, lm, airborne = false, turning = false }: DetectorFrame): void {
    if (turning) {
      // A retiré that turns is a pirouette (pirouette.ts): its start is no balance of its own.
      this.hold = null;
      this.candidate = null;
    }
    let m: BalletPoseMeasurement | null = null;
    let hint: string | null = null;
    if (!lm) hint = 'Step into the camera view';
    else if (!airborne && !turning) {
      const legs = legsUsable(lm);
      if (!legs.ok) hint = legs.reason ?? null;
      else {
        m = measureBalletPose(lm, this.library === undefined ? activeLibrary : this.library, this.s);
        hint = m.hint;
      }
    }

    if (m?.pose && this.hold && m.pose !== this.hold.pose) {
      // Another pose during a hold: switch only once it has lasted switchAfterMs, so one
      // misrecognized frame can't split a balance into two judged moves.
      if (!this.candidate || this.candidate.pose !== m.pose) this.candidate = newHold(m, t);
      addFrame(this.candidate, t, m, lm!);
      if (this.candidate.tLast - this.candidate.tStart >= this.s.switchAfterMs) {
        const next = this.candidate;
        // Under 1 s and straight into another pose = the way into it (a développé passes through
        // retiré), not a pose of its own.
        if (this.hold.tLast - this.hold.tStart < BALLET_LIMITS.minHoldMs) this.hold = null;
        else this.end();
        this.hold = next;
        this.candidate = null;
      }
    } else if (m?.pose) {
      this.candidate = null;
      this.hold ??= newHold(m, t);
      addFrame(this.hold, t, m, lm!);
    } else if (this.hold && t - this.hold.tLast > this.s.gapToleranceMs) {
      this.end();
    }
    // A balance doesn't turn: a hold that turned more than maxTurnDeg was a turn passing through the pose.
    if (this.hold && Math.abs(this.hold.rotation) > this.s.maxTurnDeg) {
      this.hold = null;
      this.candidate = null;
    }

    this.live = {
      pose: m?.pose ?? null,
      holdMs: this.hold ? this.hold.tLast - this.hold.tStart : 0,
      penalties: m?.pose && m.values ? posePenalties(m.pose, m.values) : [],
      hint: m?.pose ? null : hint,
    };
  }

  private end(): void {
    const hold = this.hold!;
    this.hold = null;
    this.candidate = null;
    const event = judgeBalletPose(hold);
    if (event) this.onEvent(event);
  }
}

function newHold(m: BalletPoseMeasurement, t: number): Hold {
  return { pose: m.pose!, tStart: t, tLast: t, rotation: 0, lastFacing: null, values: [], releve: [], visibility: 1, recognizer: m.recognizer };
}

function addFrame(hold: Hold, t: number, m: BalletPoseMeasurement, lm: Landmarks): void {
  hold.tLast = t;
  const facing = facingAngle(lm);
  if (hold.lastFacing !== null) hold.rotation += angleStep(hold.lastFacing, facing);
  hold.lastFacing = facing;
  hold.values.push(m.values!);
  if (m.releve !== null) hold.releve.push(m.releve);
  hold.visibility = Math.min(hold.visibility, minVisibility(lm, LEG_POINTS));
}

/** A finished hold, ready to be judged. */
export interface MeasuredBalletPose {
  pose: BalletPose;
  tStart: number;
  tLast: number;
  values: PoseValues[];
  releve: boolean[];
  visibility: number;
  recognizer?: string;
}

/** Turns one held ballet pose into a judged event using the rubric. null when it was too short to judge. */
export function judgeBalletPose(h: MeasuredBalletPose): ElementEvent | null {
  const durationMs = h.tLast - h.tStart;
  if (durationMs < BALLET_LIMITS.minPoseMs) return null;
  const rule = RULES[h.pose];
  // Median over the hold: robust to a few noisy frames.
  const medianOf = (key: keyof PoseValues) => {
    const values = h.values.map((v) => v[key]).filter((x): x is number => x !== undefined);
    return values.length ? median(values) : undefined;
  };
  const v: PoseValues = {
    legHeight: medianOf('legHeight'),
    workingKnee: medianOf('workingKnee'),
    supportKnee: medianOf('supportKnee'),
    trunk: medianOf('trunk') ?? 0,
    footBelowKneePct: medianOf('footBelowKneePct'),
    kneeGap: medianOf('kneeGap'),
    deepestKnee: h.values.length && h.pose === 'plie' ? Math.min(...h.values.map((x) => x.deepestKnee ?? 180)) : undefined,
  };
  const penalties = posePenalties(h.pose, v);
  const isPlie = h.pose === 'plie';
  if (!isPlie && durationMs < BALLET_LIMITS.minHoldMs) {
    penalties.push({
      reason: `Pose not held for 1 second (${(durationMs / 1000).toFixed(1)} s)`,
      value: BALLET_LIMITS.shortHoldPenalty, ref: '#B4 Ballet rubric', segment: 'hold', holdMs: Math.round(durationMs),
    });
  }
  const releveShare = h.releve.length ? h.releve.filter(Boolean).length / h.releve.length : null;
  const measurements: Measurements = {
    holdMs: Math.round(durationMs),
    ...(v.legHeight !== undefined ? { extensionDeg: Math.round(v.legHeight) } : {}),
    trunkDevDeg: Math.round(v.trunk),
    ...(v.deepestKnee !== undefined ? { kneeDeg: Math.round(v.deepestKnee) } : {}),
    ...(!isPlie && releveShare !== null ? { relevePct: Math.round(releveShare * 100) } : {}),
  };
  const warnings: string[] = [];
  if (h.pose === 'seconde' || h.pose === 'plie') warnings.push('Turnout and knees over the toes are not measured: the teacher checks them');
  // A fourth-position plié (one foot in front) looks uneven from the front: the check assumes 1st / 2nd.
  if (isPlie) warnings.push('Even knees assume first or second position: in fourth or fifth the knees look uneven');
  if (['arabesque', 'attitude', 'devant'].includes(h.pose)) warnings.push('Pointed feet and turnout are not measured: the teacher checks them');
  if (h.visibility < 0.5) warnings.push('Legs partly hidden: low confidence');
  warnings.push('Rubric values not yet checked by a ballet teacher');
  const name = isPlie ? ((v.deepestKnee ?? 180) < 100 ? 'Grand plié' : 'Demi-plié') : rule.name;
  return {
    element: name,
    code: rule.code,
    t: h.tStart,
    tStart: h.tStart,
    tEnd: h.tLast,
    dbValid: true,
    dbValue: 0, // held poses are judged on technique only
    penalties,
    measurements,
    confidence: Math.round(h.visibility * 10) / 10,
    warnings,
    requirement: rule.requirement,
    recognizedBy: h.recognizer ?? 'rules',
    ruleRef: rule.ref,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const k = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[k] : (sorted[k - 1] + sorted[k]) / 2;
}

