// Body measurements of one frame, shared by the balance rules (balances.ts) and the
// learned pose library (library/signature.ts), so both always see the same numbers.

import {
  LM, clamp, dist, distToSegment, facingSign, headTopY, isOnReleve, jointAngle, legElevation,
  legLengthRatios, legPoints, mid, signedAngle, splitAngle, sub, thighElevation, toDeg, torsoLength, trunkLeanX, trunkTilt,
  type Landmark, type Landmarks, type LegPoints, type Point,
} from '../geometry';
import { legsFullLength } from './splitLeap';

export const BALANCE_SETTINGS = {
  minVisibility: 0.5,
  minSplitToRecognize: 135, // below this it's not a split attempt at all
  straightKneeDeg: 150, // free knee at least this straight for split shapes
  attitudeKneeMin: 60, // attitude free knee is bent between these angles
  attitudeKneeMax: 140,
  minAttitudeThighDeg: 55, // thigh raised at least this much (90 = horizontal)
  minBackLegElevation: 120, // back split: leg at least 30° above horizontal (not an arabesque)
  maxUprightTrunkTilt: 60, // back split with the trunk more upright than this = foot-above-head (row 10)
  minTrunkForwardLean: 65, // back split with the trunk leaning this far forward = trunk-forward (row 11)
  maxAttitudeTrunkTilt: 45, // more lean = another element (e.g. penché), not an attitude
  minFreeLegVisibility: 0.03, // raised leg below this confidence is ignored even if plausible
  legLengthTolerance: [0.6, 1.4] as [number, number], // raised thigh and shin vs the support leg's, for a plausible leg
  helpDistance: 0.3, // hand within 0.3 torso lengths of the free shin/foot = help
  // A low-confidence hand must be right on the leg to count: holding hands in the team's video were
  // 0.00-0.03 torso lengths away; an open hand beside the leg (London 2012 photo) was 0.10.
  helpDistanceUnsure: 0.07,
  releveHeelLift: 0.12,
  releveMinShare: 0.6,
  gapToleranceMs: 400, // tracking dropouts up to 0.4 s don't end the hold
  switchAfterMs: 250, // another shape must last this long before the hold switches to it
  minBalanceMs: 300, // shorter = passing movement or a swing/kick, not a balance attempt
};
export type BalanceSettings = typeof BALANCE_SETTINGS;

export interface LegsUsable {
  ok: boolean;
  confidence: number;
  lowConfidenceLeg?: boolean;
  reason?: string;
}

/**
 * Can the legs be measured in this frame?
 * The hips and the SUPPORT leg must be clearly seen. The RAISED leg is often reported with low
 * confidence by the pose model in splits (unusual pose, dark leggings on a dark background) even
 * when its position is right, so it is also accepted when its shape is plausible: thigh and shin
 * about as long as the support leg's. Checked on the team's front split video (raised leg at
 * 4-28% confidence, but correctly placed).
 */
export function legsUsable(lm: Landmarks | null, s = BALANCE_SETTINGS): LegsUsable {
  if (!lm) return { ok: false, confidence: 0, reason: 'Step into the camera view' };
  const leftIsFree = lm[LM.L_ANKLE].y < lm[LM.R_ANKLE].y;
  const free = legPoints(lm, leftIsFree ? 'L' : 'R');
  const support = legPoints(lm, leftIsFree ? 'R' : 'L');
  const vis = (p: Landmark | undefined) => p?.visibility ?? 0;
  const supportVis = Math.min(vis(lm[LM.L_HIP]), vis(lm[LM.R_HIP]), vis(support.knee), vis(support.ankle));
  if (supportVis < s.minVisibility) {
    return { ok: false, confidence: supportVis, reason: 'Whole body and both feet must be in view' };
  }
  const freeVis = Math.min(vis(free.knee), vis(free.ankle));
  if (freeVis >= s.minVisibility) return { ok: true, confidence: Math.min(supportVis, freeVis), lowConfidenceLeg: false };
  const [lo, hi] = s.legLengthTolerance;
  const thigh = dist(free.hip, free.knee) / dist(support.hip, support.knee);
  const shin = dist(free.knee, free.ankle) / dist(support.knee, support.ankle);
  const plausible = freeVis >= s.minFreeLegVisibility && thigh >= lo && thigh <= hi && shin >= lo && shin <= hi;
  return plausible
    ? { ok: true, confidence: freeVis, lowConfidenceLeg: true }
    : { ok: false, confidence: freeVis, reason: 'Raised leg not visible: try a plain background and contrasting clothes' };
}

/** Everything the balance rules need from one frame. */
export interface BalanceFrame {
  torso: number;
  free: LegPoints;
  support: LegPoints;
  hips: Landmark;
  facing: number;
  forward: boolean | null;
  raised: boolean;
  help: boolean;
  releve: boolean | null;
  fullLegs: boolean;
  split: number;
  trunk: number;
  lean: number;
  freeKnee: number;
  thighDeg: number;
  legUp: number;
  headTop: number | null;
  footAtHead: boolean;
  footOverHead: number | null;
  footOverHip: number;
  footBelowHeadDeg: number | null;
}

/**
 * Everything the balance rules need from one frame. null if the body can't be measured.
 * Free leg = the leg with the higher ankle; support leg = the other one.
 */
export function balanceFrame(lm: Landmarks, s = BALANCE_SETTINGS): BalanceFrame | null {
  const torso = torsoLength(lm);
  if (!torso) return null;

  const leftIsFree = lm[LM.L_ANKLE].y < lm[LM.R_ANKLE].y;
  const free = legPoints(lm, leftIsFree ? 'L' : 'R');
  const support = legPoints(lm, leftIsFree ? 'R' : 'L');
  const hips = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  const thighLen = Math.max(dist(free.hip, free.knee), dist(support.hip, support.knee));
  const shinLen = Math.max(dist(free.knee, free.ankle), dist(support.knee, support.ankle));
  const facing = facingSign(lm, support.side);

  // Signed trunk lean: + = trunk leans the way she faces, - = leans back.
  const lean = facing === 0 ? trunkTilt(lm) : trunkLeanX(lm) * facing;

  // Forward or backward leg? Angle of the free leg around the hips, + on the side she faces.
  // Near vertical (within 20°) the leg line is the same for a front and a back split, so the trunk
  // decides: real front splits keep the trunk upright or leaning back, back splits lean it forward
  // (checked on competition photos: front splits -24° and -35°).
  // (signedAngle from 'down' is positive toward -x in image coordinates, hence the minus.)
  const legSide = facing === 0 ? null : -signedAngle({ x: 0, y: 1 }, sub(free.ankle, hips)) * facing;
  const forward = legSide === null ? null : Math.abs(legSide) > 160 ? lean <= 10 : legSide > 0;

  const headTop = headTopY(lm);
  const footLow = lowestFootPoint(free);

  return {
    torso,
    free,
    support,
    hips,
    facing,
    forward,
    raised: free.ankle.y < support.knee.y, // free leg lifted at all
    help: hasHelp(lm, free, torso, s),
    releve: isOnReleve(support.heel, support.toe, shinLen, s.releveHeelLift),
    fullLegs: legsFullLength(legLengthRatios(lm)),
    split: splitAngle(lm),
    trunk: trunkTilt(lm),
    lean,
    freeKnee: jointAngle(free.hip, free.knee, free.ankle),
    thighDeg: thighElevation(free.hip, free.knee, thighLen),
    legUp: legElevation(hips, free.ankle),
    headTop,
    footAtHead: headTop !== null && free.ankle.y < headTop + 0.25 * torso,
    // How far the lowest point of the free foot is above the head top, in torso lengths.
    footOverHead: headTop === null ? null : (headTop - footLow.y) / torso,
    // How far the free ankle is above the hips, in torso lengths.
    footOverHip: (hips.y - free.ankle.y) / torso,
    footBelowHeadDeg: footBelowHeadDeg(hips, footLow, headTop),
  };
}

/** Lowest visible point of the foot: "whole foot above the head" means heel AND toes. */
function lowestFootPoint(free: LegPoints): Landmark {
  const points = [free.heel, free.toe].filter((p) => (p?.visibility ?? 0) >= 0.3);
  return points.length ? points.reduce((a, b) => (b.y > a.y ? b : a)) : free.ankle;
}

/**
 * Degrees the free leg still has to rise (rotating at the hip) until the WHOLE foot is above
 * the top of the head. 0 when it already is. null when the head can't be seen.
 */
function footBelowHeadDeg(hips: Point, low: Point, headTop: number | null): number | null {
  if (headTop === null) return null;
  if (low.y <= headTop) return 0;
  const radius = dist(hips, low); // the foot moves on this circle when the leg rises
  const rise = hips.y - headTop; // how high above the hips the head top is
  const neededDeg = toDeg(Math.acos(clamp(-rise / radius, -1, 1))); // elevation that reaches head height
  return Math.max(0, neededDeg - legElevation(hips, low));
}

/**
 * Is a hand holding the free leg (shin or foot)?
 * A clearly seen hand counts within helpDistance. A hand the model is unsure about (dark sleeves,
 * fast motion) counts only when it is right on the leg (gripping), not just beside it.
 */
function hasHelp(lm: Landmarks, free: LegPoints, torso: number, s: BalanceSettings): boolean {
  const toLeg = (h: Point) => Math.min(distToSegment(h, free.knee, free.ankle), distToSegment(h, free.ankle, free.toe ?? free.ankle));
  return [LM.L_WRIST, LM.R_WRIST, LM.L_INDEX, LM.R_INDEX]
    .map((i) => lm[i])
    .some((h) => {
      if (!h) return false;
      const v = h.visibility ?? 0;
      if (v >= 0.3) return toLeg(h) < s.helpDistance * torso;
      return v >= 0.05 && toLeg(h) < s.helpDistanceUnsure * torso;
    });
}
