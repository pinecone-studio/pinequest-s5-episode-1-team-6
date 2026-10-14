// Synthetic ballet skeletons with exactly known angles. Used by the unit tests and as default examples
// for the ballet pose library (scripts/buildDefaultLibrary.ts), so changing them changes what the app ships.
// Same units as lib/library/examples/poses.ts: pixels, y grows downward, torso = 100 px,
// thigh = shin = 90 px. Side-on poses reuse the gymnastics builders (support = right leg, free = left).

import { LM, type Landmark, type Landmarks } from '../../geometry';
import {
  arabesqueBalance, attitudeBalance, frontSplitBalance, passePose, standing, type BalanceOptions,
} from '../../library/examples/poses';

const CX = 300;
const HIP_Y = 300;
const TORSO = 100;
const THIGH = 90;
const SHIN = 90;
const FLOOR_Y = HIP_Y + THIGH + SHIN + 8;

const p = (x: number, y: number, visibility = 1): Landmark => ({ x, y, visibility });
const rad = (deg: number) => (deg * Math.PI) / 180;

export interface SideOptions extends BalanceOptions {
  supportKneeDeg?: number; // standing knee, 180 = straight
}

/** Bends the standing (right) knee to `kneeDeg` by moving the knee forward, hip and ankle stay. */
function bendSupportKnee(lm: Landmarks, kneeDeg: number, facing: number): Landmarks {
  if (kneeDeg >= 180) return lm;
  const out = lm.map((pt) => ({ ...pt }));
  const hip = out[LM.R_HIP];
  const ankle = out[LM.R_ANKLE];
  const half = Math.hypot(ankle.x - hip.x, ankle.y - hip.y) / 2;
  const offset = half * Math.tan(rad((180 - kneeDeg) / 2));
  out[LM.R_KNEE] = p((hip.x + ankle.x) / 2 + offset * facing, (hip.y + ankle.y) / 2);
  return out;
}

const side = (lm: Landmarks, o: SideOptions) => bendSupportKnee(lm, o.supportKneeDeg ?? 180, o.facing ?? 1);

/** Arabesque, side-on: straight free leg behind at `legDeg` from straight down. */
export function balletArabesque({ legDeg = 95, trunkTilt = 10, ...o }: SideOptions & { legDeg?: number } = {}): Landmarks {
  return side(arabesqueBalance({ legDeg, trunkTilt, ...o }), o);
}

/** Attitude (derrière), side-on: thigh behind at `thighDeg`, knee bent to `kneeDeg`. */
export function balletAttitude(
  { thighDeg = 95, kneeDeg = 100, trunkTilt = 5, ...o }: SideOptions & { thighDeg?: number; kneeDeg?: number } = {},
): Landmarks {
  return side(attitudeBalance({ thighDeg, kneeDeg, trunkTilt, ...o }), o);
}

/** Développé devant, side-on: straight free leg in front at `legDeg` from straight down. */
export function balletDevant({ legDeg = 95, trunkTilt = 0, ...o }: SideOptions & { legDeg?: number } = {}): Landmarks {
  return side(frontSplitBalance({ splitDeg: legDeg, trunkTilt: -trunkTilt, ...o }), o);
}

/**
 * Retiré, side-on: free thigh at `thighDeg`, toe at the standing knee, moved down by `footDrop`
 * shin lengths (a foot below the knee).
 */
export function balletRetireSide({ thighDeg = 70, footDrop = 0, releve = true, width = 0.15 } = {}): Landmarks {
  const lm = passePose({ thighDeg, releve, width });
  for (const i of [LM.L_ANKLE, LM.L_FOOT, LM.L_HEEL]) lm[i] = p(lm[i].x, lm[i].y + footDrop * SHIN);
  return lm;
}

// ---------- Facing the camera ----------

export interface FrontOptions {
  width?: number; // shoulders apart / torso
  trunkTilt?: number; // sideways lean of the trunk, degrees
  releve?: boolean;
}

/** Upper body facing the camera, arms in second position. Her left = image +x. */
function frontBody(hipY: number, { width = 0.7, trunkTilt = 0 }: FrontOptions): Landmarks {
  const half = (width * TORSO) / 2;
  const a = rad(trunkTilt);
  const top = (dx: number, up: number) => p(CX + dx * Math.cos(a) + up * Math.sin(a), hipY - up * Math.cos(a) + dx * Math.sin(a));
  const lm = Array.from({ length: 33 }, () => top(0, TORSO * 1.3));
  lm[LM.L_SHOULDER] = top(half, TORSO);
  lm[LM.R_SHOULDER] = top(-half, TORSO);
  lm[LM.NOSE] = top(0, TORSO + 35);
  lm[LM.L_EYE] = top(6, TORSO + 40);
  lm[LM.R_EYE] = top(-6, TORSO + 40);
  lm[LM.L_EAR] = top(14, TORSO + 36);
  lm[LM.R_EAR] = top(-14, TORSO + 36);
  // Second position: arms out and slightly down, elbows soft.
  lm[LM.L_ELBOW] = top(half + 50, TORSO - 15);
  lm[LM.R_ELBOW] = top(-half - 50, TORSO - 15);
  lm[LM.L_WRIST] = top(half + 100, TORSO - 30);
  lm[LM.R_WRIST] = top(-half - 100, TORSO - 30);
  lm[LM.L_INDEX] = top(half + 108, TORSO - 32);
  lm[LM.R_INDEX] = top(-half - 108, TORSO - 32);
  lm[LM.L_HIP] = p(CX + 15, hipY);
  lm[LM.R_HIP] = p(CX - 15, hipY);
  return lm;
}

/** The standing (right) leg straight down, toes turned out toward image -x. */
function frontSupport(lm: Landmarks, releve: boolean): void {
  const hip = lm[LM.R_HIP];
  lm[LM.R_KNEE] = p(hip.x, HIP_Y + THIGH);
  const ankleY = HIP_Y + THIGH + SHIN - (releve ? 6 : 0);
  lm[LM.R_ANKLE] = p(hip.x, ankleY);
  lm[LM.R_FOOT] = p(hip.x - 9, FLOOR_Y);
  lm[LM.R_HEEL] = p(hip.x + 3, releve ? ankleY - 6 : FLOOR_Y);
}

/** À la seconde, facing the camera: straight free (left) leg out to her side at `legDeg`. */
export function balletSeconde({ legDeg = 95, kneeDeg = 180, releve = false, ...o }: FrontOptions & { legDeg?: number; kneeDeg?: number } = {}): Landmarks {
  const lm = frontBody(HIP_Y, o);
  frontSupport(lm, releve);
  const hip = lm[LM.L_HIP];
  const dir = { x: Math.sin(rad(legDeg)), y: Math.cos(rad(legDeg)) };
  const knee = p(hip.x + THIGH * dir.x, hip.y + THIGH * dir.y);
  // A bent knee folds the shin down toward the floor.
  const shinDeg = legDeg - (180 - kneeDeg);
  const ankle = p(knee.x + SHIN * Math.sin(rad(shinDeg)), knee.y + SHIN * Math.cos(rad(shinDeg)));
  lm[LM.L_KNEE] = knee;
  lm[LM.L_ANKLE] = ankle;
  lm[LM.L_FOOT] = p(ankle.x + 10 * Math.sin(rad(shinDeg)), ankle.y + 10 * Math.cos(rad(shinDeg)));
  lm[LM.L_HEEL] = p(ankle.x - 3 * Math.sin(rad(shinDeg)), ankle.y - 3 * Math.cos(rad(shinDeg)));
  return lm;
}

/**
 * Plié, facing the camera, turned out: both knees bent (`leftKneeDeg`, `rightKneeDeg`) and opening
 * out to the sides over the toes, both feet flat on the floor, the hips lowered straight down.
 */
export function balletPlie({ leftKneeDeg = 110, rightKneeDeg = 110, ...o }: FrontOptions & { leftKneeDeg?: number; rightKneeDeg?: number } = {}): Landmarks {
  // The hips sink as the knees bend: hip-to-ankle span of the more bent leg.
  const ankleY = FLOOR_Y - 8;
  const hipY = ankleY - 2 * THIGH * Math.sin(rad(Math.min(leftKneeDeg, rightKneeDeg) / 2));
  const lm = frontBody(hipY, o);
  for (const [s, kneeDeg, out] of [['L', leftKneeDeg, 1], ['R', rightKneeDeg, -1]] as const) {
    const hip = lm[LM[`${s}_HIP`]];
    const ankle = p(hip.x + out * 10, ankleY);
    // The knee sits out to the side of the hip-ankle line, far enough for exactly `kneeDeg` at the knee.
    const half = Math.hypot(ankle.x - hip.x, ankle.y - hip.y) / 2;
    const offset = half / Math.tan(rad(kneeDeg / 2));
    lm[LM[`${s}_KNEE`]] = p((hip.x + ankle.x) / 2 + out * offset, (hip.y + ankle.y) / 2);
    lm[LM[`${s}_ANKLE`]] = ankle;
    lm[LM[`${s}_FOOT`]] = p(ankle.x + out * 10, FLOOR_Y);
    lm[LM[`${s}_HEEL`]] = p(ankle.x - out * 3, FLOOR_Y);
  }
  return lm;
}

/** Standing facing the camera, heels together, turned out (first position). */
export function balletStandingFront(o: FrontOptions = {}): Landmarks {
  const lm = frontBody(HIP_Y, o);
  frontSupport(lm, o.releve ?? false);
  const hip = lm[LM.L_HIP];
  lm[LM.L_KNEE] = p(hip.x, HIP_Y + THIGH);
  lm[LM.L_ANKLE] = p(hip.x, HIP_Y + THIGH + SHIN);
  lm[LM.L_FOOT] = p(hip.x + 9, FLOOR_Y);
  lm[LM.L_HEEL] = p(hip.x - 3, FLOOR_Y);
  return lm;
}

/** Tendu to the side, facing the camera: straight free leg out, toe on the floor (not a held pose). */
export function balletTenduSeconde(o: FrontOptions = {}): Landmarks {
  return balletSeconde({ ...o, legDeg: 28 });
}

/** Retiré facing the camera, turned out: knee out to the side, toe at the standing knee. */
export function balletRetireFront({ footDrop = 0, releve = true, ...o }: FrontOptions & { footDrop?: number } = {}): Landmarks {
  const lm = frontBody(HIP_Y, o);
  frontSupport(lm, releve);
  const hip = lm[LM.L_HIP];
  lm[LM.L_KNEE] = p(hip.x + THIGH * Math.sin(rad(60)), hip.y + THIGH * Math.cos(rad(60)));
  const supportKnee = lm[LM.R_KNEE];
  lm[LM.L_ANKLE] = p(supportKnee.x + 6, supportKnee.y + footDrop * SHIN);
  lm[LM.L_FOOT] = p(supportKnee.x + 2, supportKnee.y + 10 + footDrop * SHIN);
  lm[LM.L_HEEL] = p(supportKnee.x + 10, supportKnee.y - 2 + footDrop * SHIN);
  return lm;
}

/**
 * Retiré seen while turning (pirouette): a 3D body rotated `turnDeg` around the vertical axis and
 * projected onto the image (0 = facing the camera, 90 = side-on). Free leg = left, thigh turned out
 * to her side and raised `thighDeg`, toe at the standing knee (moved down by `footDrop` shin lengths).
 * Shoulders 0.6 torso lengths apart and the nose 0.35 ahead, as geometry.ts facingAngle() expects.
 */
export function retireTurnPose(turnDeg: number, { thighDeg = 60, footDrop = 0, releve = true } = {}): Landmarks {
  const c = Math.cos(rad(turnDeg));
  const s = Math.sin(rad(turnDeg));
  const at = (lateral: number, front: number, y: number) => p(CX + lateral * c - front * s, y);
  const lm = Array.from({ length: 33 }, () => at(0, 0, HIP_Y - TORSO * 1.3));
  lm[LM.L_SHOULDER] = at(30, 0, HIP_Y - TORSO);
  lm[LM.R_SHOULDER] = at(-30, 0, HIP_Y - TORSO);
  lm[LM.NOSE] = at(0, 35, HIP_Y - TORSO - 30);
  lm[LM.L_HIP] = at(15, 0, HIP_Y);
  lm[LM.R_HIP] = at(-15, 0, HIP_Y);
  // Standing leg (right) straight down.
  lm[LM.R_KNEE] = at(-15, 0, HIP_Y + THIGH);
  const ankleY = HIP_Y + THIGH + SHIN - (releve ? 6 : 0);
  lm[LM.R_ANKLE] = at(-15, 0, ankleY);
  lm[LM.R_FOOT] = at(-15, 10, FLOOR_Y);
  lm[LM.R_HEEL] = at(-15, -4, releve ? ankleY - 6 : FLOOR_Y);
  // Working leg: thigh out to her left (turned out), toe at the standing knee.
  const kneeOut = 15 + THIGH * Math.sin(rad(thighDeg));
  lm[LM.L_KNEE] = at(kneeOut, 0, HIP_Y + THIGH * Math.cos(rad(thighDeg)));
  const toeY = HIP_Y + THIGH + footDrop * SHIN;
  lm[LM.L_ANKLE] = at(-8, 6, toeY);
  lm[LM.L_FOOT] = at(-12, 4, toeY + 8);
  lm[LM.L_HEEL] = at(-4, 8, toeY - 2);
  return lm;
}

export { standing };
