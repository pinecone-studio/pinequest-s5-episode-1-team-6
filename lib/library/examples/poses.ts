// Synthetic skeletons with exactly known angles. Used by the unit tests and as default examples for
// the pose library (scripts/buildDefaultLibrary.ts), so changing them changes what the app ships.
// Pixel coordinates, y grows downward. Torso = 100 px, thigh = shin = 90 px
// (real proportions: a leg is about 1.8-2 torso lengths).

import { LM, type Landmark, type Landmarks, type Side } from '../../geometry';
import type { DetectorFrame } from '../../elements/splitLeap';

const CX = 300;
const HIP_Y = 300;
const TORSO = 100;
const THIGH = 90;
const SHIN = 90;
const FLOOR_Y = HIP_Y + THIGH + SHIN + 8; // toes touch the floor here when standing

const p = (x: number, y: number, visibility = 1): Landmark => ({ x, y, visibility });
const rad = (deg: number) => (deg * Math.PI) / 180;
const idx = (key: string) => LM[key as keyof typeof LM];

/** Empty 33-landmark skeleton with the upper body placed. */
function body({ width, rise }: { width: number; rise: number }): Landmarks {
  const lm = Array.from({ length: 33 }, () => p(CX, HIP_Y - rise - TORSO * 1.3));
  const half = (width * TORSO) / 2;
  const hipY = HIP_Y - rise;
  lm[LM.L_SHOULDER] = p(CX - half, hipY - TORSO);
  lm[LM.R_SHOULDER] = p(CX + half, hipY - TORSO);
  lm[LM.L_HIP] = p(CX - half, hipY);
  lm[LM.R_HIP] = p(CX + half, hipY);
  return lm;
}

/** Straight leg from `from` at `deg` from straight down (positive = forward, +x). */
function straightLeg(lm: Landmarks, sideKey: Side, from: Landmark, deg: number): void {
  const dx = Math.sin(rad(deg));
  const dy = Math.cos(rad(deg));
  lm[idx(`${sideKey}_KNEE`)] = p(from.x + THIGH * dx, from.y + THIGH * dy);
  const ankle = p(from.x + (THIGH + SHIN) * dx, from.y + (THIGH + SHIN) * dy);
  lm[idx(`${sideKey}_ANKLE`)] = ankle;
  lm[idx(`${sideKey}_FOOT`)] = p(ankle.x + 10 * dx, ankle.y + 10 * dy);
  lm[idx(`${sideKey}_HEEL`)] = p(ankle.x - 3 * dx, ankle.y - 3 * dy);
}

/** Moves shoulders and hips apart to the body width, keeping their midpoints. */
function widen(lm: Landmarks, width: number): void {
  const half = (width * TORSO) / 2;
  for (const [key, dx] of [['L_SHOULDER', -half], ['R_SHOULDER', half], ['L_HIP', -half], ['R_HIP', half]] as const) {
    lm[LM[key]] = p(lm[LM[key]].x + dx, lm[LM[key]].y);
  }
}

/** Standing on flat feet. width = body width ratio (0.15 side-on, 0.7 facing camera). */
export function standing({ width = 0.15 } = {}): Landmarks {
  const lm = body({ width, rise: 0 });
  for (const s of ['L', 'R'] as const) {
    const hip = lm[idx(`${s}_HIP`)];
    lm[idx(`${s}_KNEE`)] = p(hip.x, HIP_Y + THIGH);
    lm[idx(`${s}_ANKLE`)] = p(hip.x, HIP_Y + THIGH + SHIN);
    lm[idx(`${s}_FOOT`)] = p(hip.x + 10, FLOOR_Y);
    lm[idx(`${s}_HEEL`)] = p(hip.x - 4, FLOOR_Y);
  }
  return lm;
}

/** In the air, legs straight and `splitDeg` apart, symmetric around the trunk. */
export function splitPose(splitDeg: number, { rise = 40, width = 0.15 } = {}): Landmarks {
  const lm = body({ width: 0, rise }); // legs from one hip point -> exact split angle
  straightLeg(lm, 'L', lm[LM.L_HIP], splitDeg / 2);
  straightLeg(lm, 'R', lm[LM.R_HIP], -splitDeg / 2);
  // Now set the real body width (shoulders/hips), keeping the hip midpoint.
  widen(lm, width);
  return lm;
}

/**
 * Passé on the right (support) leg; the left thigh raised `thighDeg` from straight down.
 * releve: heel lifted. width: body width ratio (changes as the gymnast turns).
 */
export function passePose({ thighDeg = 90, releve = true, width = 0.15 } = {}): Landmarks {
  const lm = standing({ width });
  // Support leg (right): straight, on relevé the heel lifts above the toes.
  const rHip = lm[LM.R_HIP];
  if (releve) {
    lm[LM.R_ANKLE] = p(rHip.x, HIP_Y + THIGH + SHIN - 6);
    lm[LM.R_HEEL] = p(rHip.x - 4, FLOOR_Y - 20);
  }
  // Free leg (left): thigh at thighDeg, foot at the support knee.
  const lHip = lm[LM.L_HIP];
  const knee = p(lHip.x + THIGH * Math.sin(rad(thighDeg)), HIP_Y + THIGH * Math.cos(rad(thighDeg)));
  lm[LM.L_KNEE] = knee;
  const supportKnee = lm[LM.R_KNEE];
  lm[LM.L_ANKLE] = p(supportKnee.x + 5, supportKnee.y + 5);
  lm[LM.L_FOOT] = p(supportKnee.x + 2, supportKnee.y + 12);
  lm[LM.L_HEEL] = p(supportKnee.x + 8, supportKnee.y + 2);
  return lm;
}

// ---------- Balances on the right (support) leg, side-on, facing +x (facing: 1) or -x (-1) ----------

export interface BalanceOptions {
  facing?: number;
  releve?: boolean;
  help?: boolean;
  trunkTilt?: number;
  width?: number;
}

/**
 * Builds a balance skeleton: support leg straight down, free (left) leg placed by `placeFree`.
 * Adds a head (for "foot above head") and hands (forward, or holding the free foot if help).
 */
function balanceBody(
  { facing = 1, releve = true, help = false, trunkTilt = 0, width = 0.15 }: BalanceOptions,
  placeFree: (lm: Landmarks, hip: Landmark) => void,
): Landmarks {
  const lm = body({ width: 0, rise: 0 }); // legs from one hip point, widened below
  const hip = lm[LM.L_HIP];
  // Support leg (right) straight down; toes point the way she faces.
  lm[LM.R_KNEE] = p(hip.x, HIP_Y + THIGH);
  const ankleY = HIP_Y + THIGH + SHIN - (releve ? 6 : 0);
  lm[LM.R_ANKLE] = p(hip.x, ankleY);
  lm[LM.R_FOOT] = p(hip.x + 10 * facing, FLOOR_Y);
  lm[LM.R_HEEL] = p(hip.x - 4 * facing, releve ? ankleY - 6 : FLOOR_Y);
  placeFree(lm, hip);

  // Head and hands, then lean the upper body forward by trunkTilt around the hips.
  const shoulderY = HIP_Y - TORSO;
  lm[LM.NOSE] = p(hip.x + 12 * facing, shoulderY - 40);
  lm[LM.L_EYE] = p(hip.x + 8 * facing, shoulderY - 43);
  lm[LM.R_EYE] = p(hip.x + 8 * facing, shoulderY - 43);
  lm[LM.L_EAR] = p(hip.x - 5 * facing, shoulderY - 40);
  lm[LM.R_EAR] = p(hip.x - 5 * facing, shoulderY - 40);
  for (const i of [LM.L_WRIST, LM.R_WRIST, LM.L_INDEX, LM.R_INDEX]) lm[i] = p(hip.x + 100 * facing, shoulderY);
  const a = rad(trunkTilt * facing);
  for (const i of [LM.NOSE, LM.L_EYE, LM.R_EYE, LM.L_EAR, LM.R_EAR, LM.L_SHOULDER, LM.R_SHOULDER,
    LM.L_WRIST, LM.R_WRIST, LM.L_INDEX, LM.R_INDEX]) {
    const dx = lm[i].x - hip.x;
    const dy = lm[i].y - HIP_Y;
    lm[i] = p(hip.x + dx * Math.cos(a) - dy * Math.sin(a), HIP_Y + dx * Math.sin(a) + dy * Math.cos(a));
  }
  if (help) {
    // One hand holds the free leg at the ankle (after the lean, so it stays on the leg).
    const ankle = lm[LM.L_ANKLE];
    lm[LM.L_WRIST] = p(ankle.x + 3, ankle.y + 3);
    lm[LM.L_INDEX] = p(ankle.x + 5, ankle.y + 1);
  }
  widen(lm, width);
  return lm;
}

/** Front split balance: free leg forward, `splitDeg` from the support leg. */
export function frontSplitBalance({ splitDeg = 180, ...opts }: BalanceOptions & { splitDeg?: number } = {}): Landmarks {
  const facing = opts.facing ?? 1;
  return balanceBody(opts, (lm, hip) => straightLeg(lm, 'L', hip, facing * splitDeg));
}

/**
 * Back split balance: straight free leg backward, raised `legDeg` from straight down.
 * The trunk leans forward 20° by default, as in real back splits.
 */
export function backSplitBalance({ legDeg = 170, trunkTilt = 20, ...opts }: BalanceOptions & { legDeg?: number } = {}): Landmarks {
  const facing = opts.facing ?? 1;
  return balanceBody({ ...opts, trunkTilt }, (lm, hip) => straightLeg(lm, 'L', hip, -facing * legDeg));
}

/** Arabesque: straight free leg backward at the horizontal (not one of our three shapes). */
export function arabesqueBalance(opts: BalanceOptions & { legDeg?: number } = {}): Landmarks {
  return backSplitBalance({ legDeg: 95, ...opts });
}

/** Attitude: free thigh backward at `thighDeg`, knee bent to `kneeDeg`, shin rising. */
export function attitudeBalance(
  { thighDeg = 90, kneeDeg = 90, ...opts }: BalanceOptions & { thighDeg?: number; kneeDeg?: number } = {},
): Landmarks {
  const facing = opts.facing ?? 1;
  return balanceBody(opts, (lm, hip) => {
    const thighAngle = -facing * thighDeg; // signed angle from straight down
    const shinAngle = thighAngle - facing * (180 - kneeDeg);
    const knee = p(hip.x + THIGH * Math.sin(rad(thighAngle)), hip.y + THIGH * Math.cos(rad(thighAngle)));
    const ankle = p(knee.x + SHIN * Math.sin(rad(shinAngle)), knee.y + SHIN * Math.cos(rad(shinAngle)));
    lm[LM.L_KNEE] = knee;
    lm[LM.L_ANKLE] = ankle;
    lm[LM.L_FOOT] = p(ankle.x + 10 * Math.sin(rad(shinAngle)), ankle.y + 10 * Math.cos(rad(shinAngle)));
    lm[LM.L_HEEL] = p(ankle.x - 3 * Math.sin(rad(shinAngle)), ankle.y - 3 * Math.cos(rad(shinAngle)));
  });
}

/** Moves one ankle (and its foot) toward the hip: a leg pointing at the camera. */
export function foreshortenLeg(lm: Landmarks, sideKey: Side, factor: number): Landmarks {
  const hips = { x: (lm[LM.L_HIP].x + lm[LM.R_HIP].x) / 2, y: (lm[LM.L_HIP].y + lm[LM.R_HIP].y) / 2 };
  const out = lm.map((pt) => ({ ...pt }));
  for (const part of ['KNEE', 'ANKLE', 'FOOT', 'HEEL']) {
    const pt = out[idx(`${sideKey}_${part}`)];
    pt.x = hips.x + (pt.x - hips.x) * factor;
    pt.y = hips.y + (pt.y - hips.y) * factor;
  }
  return out;
}

/** Turns a list of skeletons into timed frames at ~30 FPS. null = nobody in view. */
export function frames(skeletons: (Landmarks | null)[], { startMs = 0, stepMs = 33 } = {}): DetectorFrame[] {
  return skeletons.map((lm, i) => ({ t: startMs + i * stepMs, lm }));
}

export const repeat = <T>(n: number, make: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => make(i));
