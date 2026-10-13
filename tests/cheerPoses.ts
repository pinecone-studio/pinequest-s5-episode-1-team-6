// Synthetic cheer skeletons with exactly known angles, for the cheer tests.
// Same units as lib/library/examples/poses.ts: pixels, y grows downward, torso = 100 px,
// thigh = shin = 90 px, upper arm = forearm = 55 px.
// The athlete faces the camera unless `side` is set: her LEFT is on the image's RIGHT (+x).

import { LM, type Landmark, type Landmarks, type Side } from '../lib/geometry';

const CX = 300;
const HIP_Y = 300;
const TORSO = 100;
const THIGH = 90;
const SHIN = 90;
const UPPER_ARM = 55;
const FOREARM = 55;

const p = (x: number, y: number, visibility = 1): Landmark => ({ x, y, visibility });
const rad = (deg: number) => (deg * Math.PI) / 180;
const idx = (key: string) => LM[key as keyof typeof LM];

/** Rotates a direction by `deg` (positive = clockwise on screen, since y grows downward). */
function rotate(v: { x: number; y: number }, deg: number) {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

export type ArmSpec = number | { upperDeg: number; elbowDeg: number } | 'hip';

export interface CheerPose {
  leftArm?: ArmSpec; // degrees from straight down (0 down, 90 a T, 180 up), bent, or hand on the hip
  rightArm?: ArmSpec;
  leftLeg?: number; // thigh from straight down; out to her side when facing, forward when side-on
  rightLeg?: number;
  leftKnee?: number; // knee angle, 180 = straight
  rightKnee?: number;
  rise?: number; // px off the floor
  side?: boolean; // side-on to the camera (pike, tuck)
}

/** Builds one skeleton. Defaults: standing, arms down, facing the camera. */
export function cheerPose({
  leftArm = 0, rightArm = 0, leftLeg = 0, rightLeg = 0, leftKnee = 180, rightKnee = 180, rise = 0, side = false,
}: CheerPose = {}): Landmarks {
  const hipY = HIP_Y - rise;
  const shoulderHalf = side ? 5 : 35;
  const hipHalf = side ? 4 : 15;
  const lm = Array.from({ length: 33 }, () => p(CX, hipY - TORSO * 1.3));
  // Facing: her left is +x. Side-on: legs go forward (+x) and arms out to +x/-x as if seen from the front.
  const out = (s: Side) => (s === 'L' ? 1 : -1);
  lm[LM.L_SHOULDER] = p(CX + shoulderHalf, hipY - TORSO);
  lm[LM.R_SHOULDER] = p(CX - shoulderHalf, hipY - TORSO);
  lm[LM.L_HIP] = p(CX + hipHalf, hipY);
  lm[LM.R_HIP] = p(CX - hipHalf, hipY);

  for (const s of ['L', 'R'] as const) {
    // Arm
    const shoulder = lm[idx(`${s}_SHOULDER`)];
    const spec = s === 'L' ? leftArm : rightArm;
    let elbow: Landmark;
    let wrist: Landmark;
    if (spec === 'hip') {
      elbow = p(shoulder.x + out(s) * 40, shoulder.y + 45);
      wrist = p(lm[idx(`${s}_HIP`)].x + out(s) * 15, hipY);
    } else {
      const upperDeg = typeof spec === 'number' ? spec : spec.upperDeg;
      const elbowDeg = typeof spec === 'number' ? 180 : spec.elbowDeg;
      const dir = { x: out(s) * Math.sin(rad(upperDeg)), y: Math.cos(rad(upperDeg)) };
      elbow = p(shoulder.x + UPPER_ARM * dir.x, shoulder.y + UPPER_ARM * dir.y);
      // Bend the forearm up (toward the head) by 180 - elbowDeg.
      const fore = rotate(dir, -out(s) * (180 - elbowDeg));
      wrist = p(elbow.x + FOREARM * fore.x, elbow.y + FOREARM * fore.y);
    }
    lm[idx(`${s}_ELBOW`)] = elbow;
    lm[idx(`${s}_WRIST`)] = wrist;

    // Leg
    const hip = lm[idx(`${s}_HIP`)];
    const legDeg = s === 'L' ? leftLeg : rightLeg;
    const knee = s === 'L' ? leftKnee : rightKnee;
    const legOut = side ? 1 : out(s);
    const thigh = { x: legOut * Math.sin(rad(legDeg)), y: Math.cos(rad(legDeg)) };
    const kneeP = p(hip.x + THIGH * thigh.x, hip.y + THIGH * thigh.y);
    // Bend the shin back down (toward the floor) by 180 - knee.
    const shin = rotate(thigh, legOut * (180 - knee));
    const ankle = p(kneeP.x + SHIN * shin.x, kneeP.y + SHIN * shin.y);
    lm[idx(`${s}_KNEE`)] = kneeP;
    lm[idx(`${s}_ANKLE`)] = ankle;
    lm[idx(`${s}_FOOT`)] = p(ankle.x + 6 * shin.x, ankle.y + 8);
    lm[idx(`${s}_HEEL`)] = p(ankle.x, ankle.y + 3);
  }
  return lm;
}
