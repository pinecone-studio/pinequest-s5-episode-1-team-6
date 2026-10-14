// Body measurements of one frame for ballet, shared by the ballet pose rules (poses.ts) and the
// ballet pose library (library.ts), so both always see the same numbers.
//
// Built on the gymnastics balance frame (lib/elements/balanceFrame.ts: free leg = the higher ankle,
// support leg = the other one) plus what ballet needs on top:
//   - the camera view: side-on (arabesque, attitude, développé devant) or from the front
//     (à la seconde, plié). Shoulders far apart = facing the camera.
//   - the standing knee (plié vs a pulled-up leg), the free foot against the standing knee (retiré),
//     how far the free foot is off the floor, and how far it reaches out to the side.

import { LM, clamp, dist, jointAngle, mid, torsoLength, type Landmarks } from '../geometry';
import { balanceFrame, type BalanceFrame } from '../elements/balanceFrame';

export const BALLET_FRAME_SETTINGS = {
  frontViewWidth: 0.45, // shoulders apart / torso: at least this = facing the camera (about 0.6-0.8)
};

export interface BalletFrame extends BalanceFrame {
  width: number; // shoulders apart / torso length
  frontView: boolean;
  supportKnee: number; // standing knee angle, 180 = straight
  kneeGap: number; // difference between the two knee angles (plié evenness)
  bothKneesMin: number; // the more bent knee
  // legUp (from balanceFrame) = free foot around the hips in the image plane: right from the side for a
  // leg in front or behind, and from the front for a leg to the side.
  footBelowKnee: number; // free ankle below the standing knee, in shin lengths (negative = above)
  lift: number; // free ankle above the standing ankle, in leg lengths (0 = both feet on the floor)
  sideways: number; // front view: free ankle out to the side of the hips, in leg lengths
}

/** null if the body can't be measured. */
export function balletFrame(lm: Landmarks, s = BALLET_FRAME_SETTINGS): BalletFrame | null {
  const f = balanceFrame(lm);
  if (!f) return null;
  const torso = torsoLength(lm);
  const width = dist(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]) / torso;
  const frontView = width >= s.frontViewWidth;
  const shin = Math.max(dist(f.free.knee, f.free.ankle), dist(f.support.knee, f.support.ankle));
  const leg = Math.max(dist(f.free.hip, f.free.knee), dist(f.support.hip, f.support.knee)) + shin;
  const supportKnee = jointAngle(f.support.hip, f.support.knee, f.support.ankle);
  const hips = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  return {
    ...f,
    // Facing the camera, "in front of or behind the body" can't be seen; the support foot's direction
    // (which balanceFrame uses) only shows the turnout then.
    forward: frontView ? null : f.forward,
    width,
    frontView,
    supportKnee,
    kneeGap: Math.abs(f.freeKnee - supportKnee),
    bothKneesMin: Math.min(f.freeKnee, supportKnee),
    footBelowKnee: (f.free.ankle.y - f.support.knee.y) / shin,
    lift: Math.max(0, (f.support.ankle.y - f.free.ankle.y) / leg),
    sideways: frontView ? Math.abs(f.free.ankle.x - hips.x) / leg : 0,
  };
}

/** The ballet signature's features. Order matters: stored examples use it (change only with LIBRARY_VERSION). */
export const BALLET_FEATURES = [
  { name: 'view', weight: 1.5 }, // side-on (0) or facing the camera (1)
  { name: 'freeKnee', weight: 1.2 }, // straight (arabesque, extensions) vs bent (attitude, retiré)
  { name: 'supportKnee', weight: 1.5 }, // pulled up (balances) vs bent (plié)
  { name: 'thigh', weight: 1 }, // free thigh height
  { name: 'legUp', weight: 1 }, // free foot height around the hips
  { name: 'forward', weight: 2 }, // free leg in front (1), behind (0), unknown / facing the camera (0.5)
  { name: 'lean', weight: 1 }, // trunk lean, forward (+) or back (-)
  { name: 'footAtKnee', weight: 1.5 }, // free foot against the standing knee (retiré)
  { name: 'lift', weight: 1.5 }, // free foot off the floor at all (plié: no)
  { name: 'sideways', weight: 1 }, // free foot out to the side (à la seconde)
];

/** Signature of one frame, each value scaled to about 0..1. */
export function balletSignature(f: BalletFrame): number[] {
  return [
    clamp(f.width / 0.8, 0, 1),
    f.freeKnee / 180,
    f.supportKnee / 180,
    f.thighDeg / 180,
    f.legUp / 180,
    f.forward === null ? 0.5 : f.forward ? 1 : 0,
    (clamp(f.lean, -90, 90) + 90) / 180,
    (clamp(f.footBelowKnee, -1.5, 1.5) + 1.5) / 3,
    clamp(f.lift, 0, 1.2) / 1.2,
    clamp(f.sideways, 0, 1.2) / 1.2,
  ];
}
