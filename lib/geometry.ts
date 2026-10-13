// Geometry helpers on MediaPipe Pose landmarks.
//
// All points are in PIXELS of the video frame: { x, y, visibility }.
// Image y grows DOWNWARD, so "higher on screen" means a smaller y.

/** One body point in pixels. visibility = the pose model's confidence (0..1). */
export interface Landmark {
  x: number;
  y: number;
  visibility?: number;
}

/** The 33 MediaPipe landmarks of one person, in pixels. */
export type Landmarks = Landmark[];

export interface Point {
  x: number;
  y: number;
}

export type Side = 'L' | 'R';

// MediaPipe Pose landmark indices (33 points). Only the ones we use are listed.
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
export const LM = {
  NOSE: 0,
  L_EYE: 2,
  R_EYE: 5,
  L_EAR: 7,
  R_EAR: 8,
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_ELBOW: 13,
  R_ELBOW: 14,
  L_WRIST: 15,
  R_WRIST: 16,
  L_INDEX: 19,
  R_INDEX: 20,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
  L_HEEL: 29,
  R_HEEL: 30,
  L_FOOT: 31, // "foot index" = toes
  R_FOOT: 32,
} as const;

// Landmarks a leg-based rule needs before we trust a frame.
export const LEG_POINTS = [
  LM.L_HIP, LM.R_HIP, LM.L_KNEE, LM.R_KNEE, LM.L_ANKLE, LM.R_ANKLE,
];

// Landmarks an arm-based rule (cheer motions) needs before we trust a frame.
export const ARM_POINTS = [
  LM.L_SHOULDER, LM.R_SHOULDER, LM.L_ELBOW, LM.R_ELBOW, LM.L_WRIST, LM.R_WRIST,
];

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function mid(a: Landmark, b: Landmark): Landmark {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
  };
}

export const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

/** Lowest visibility among the given landmark indices (0..1). */
export function minVisibility(lm: Landmarks, indices: number[]): number {
  return Math.min(...indices.map((i) => lm[i]?.visibility ?? 0));
}

/** Distance from mid-hip to mid-shoulder. Used as the body's size unit. */
export function torsoLength(lm: Landmarks): number {
  const hips = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  const shoulders = mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  return dist(hips, shoulders);
}

/**
 * Signed angle in degrees from vector `from` to vector `to`, in (-180, 180].
 */
export function signedAngle(from: Point, to: Point): number {
  const cross = from.x * to.y - from.y * to.x;
  const dot = from.x * to.x + from.y * to.y;
  return toDeg(Math.atan2(cross, dot));
}

/** Unsigned angle at `vertex` between the rays to `a` and `b`, in [0, 180]. */
export function jointAngle(a: Point, vertex: Point, b: Point): number {
  return Math.abs(signedAngle(sub(a, vertex), sub(b, vertex)));
}

/**
 * Angle between the two legs, in degrees (can be MORE than 180 for an over-split).
 *
 * Each leg is the line mid-hip -> ankle. Both legs are measured as signed angles
 * from the trunk's "down" direction (mid-shoulder -> mid-hip), and the split is
 * the difference. Measuring "through the bottom" like this lets a 200° over-split
 * read as 200°, where a plain unsigned angle would wrongly read 160°.
 *
 * 2D only: this is accurate only when the camera sees the split side-on.
 */
export function splitAngle(lm: Landmarks): number {
  const hips = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  const shoulders = mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  const down = sub(hips, shoulders);
  const left = signedAngle(down, sub(lm[LM.L_ANKLE], hips));
  const right = signedAngle(down, sub(lm[LM.R_ANKLE], hips));
  let split = Math.abs(left - right);
  // A gap measured "through the top" (legs nearly together above the head) is
  // not a split. No human split goes past ~270°, so fold those back.
  if (split > 270) split = 360 - split;
  return split;
}

export interface StagMeasure {
  bentKnee: number; // knee angle of the more bent leg (the front leg in a stag), 180 = straight
  otherKnee: number; // knee angle of the other leg
  split: number; // angle between the bent leg's THIGH and the other leg (hip -> ankle)
}

/**
 * Stag shape: the front leg is bent, so the "legs 180° apart" of a stag leap (CoP p. 75) is measured
 * from the front THIGH (hip -> knee) to the straight back leg (hip -> ankle), through the bottom like
 * splitAngle(). 2D only: reliable when the camera sees the leap side-on.
 */
export function stagMeasure(lm: Landmarks): StagMeasure {
  const kneeL = jointAngle(lm[LM.L_HIP], lm[LM.L_KNEE], lm[LM.L_ANKLE]);
  const kneeR = jointAngle(lm[LM.R_HIP], lm[LM.R_KNEE], lm[LM.R_ANKLE]);
  const leftBent = kneeL < kneeR;
  const hips = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  const down = sub(hips, mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]));
  const front = signedAngle(down, sub(leftBent ? lm[LM.L_KNEE] : lm[LM.R_KNEE], hips));
  const back = signedAngle(down, sub(leftBent ? lm[LM.R_ANKLE] : lm[LM.L_ANKLE], hips));
  let split = Math.abs(front - back);
  if (split > 270) split = 360 - split;
  return { bentKnee: Math.min(kneeL, kneeR), otherKnee: Math.max(kneeL, kneeR), split };
}

/**
 * How high a thigh is raised, in degrees: 0 = hanging straight down,
 * 90 = horizontal, 180 = straight up.
 *
 * Uses only the knee's VERTICAL position relative to the hip, divided by the
 * real thigh length. Vertical distances are not shortened when the gymnast turns,
 * so this works from any camera direction (important for pivots).
 */
export function thighElevation(hip: Point, knee: Point, thighLength: number): number {
  if (!thighLength) return 0;
  const cos = clamp((knee.y - hip.y) / thighLength, -1, 1);
  return toDeg(Math.acos(cos));
}

/**
 * Which way the body faces, in degrees around the vertical axis: 0 = facing the camera,
 * ±180 = back to the camera, ±90 = side-on. Used to measure pivots.
 *
 * Two cues: the shoulders' left/right order (her left shoulder is on the image's right when she
 * faces the camera, on the left when her back is to it) and how far the nose is ahead of the
 * shoulders (largest when side-on). Each is divided by its typical size (shoulders ~0.6 torso
 * lengths apart, nose ~0.35 ahead; checked on the team's pivot videos, 2026-10-13).
 * Relies on the pose model keeping left and right apart from behind, as it did in those videos.
 */
export function facingAngle(lm: Landmarks): number {
  const torso = torsoLength(lm);
  if (!torso) return 0;
  const shoulders = mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  const across = (lm[LM.L_SHOULDER].x - lm[LM.R_SHOULDER].x) / torso / 0.6;
  const ahead = (lm[LM.NOSE].x - shoulders.x) / torso / 0.35;
  return toDeg(Math.atan2(ahead, across));
}

/** Smallest signed change from angle a to angle b, in degrees (-180..180). */
export function angleStep(a: number, b: number): number {
  let d = b - a;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

/**
 * Are both legs seen at (nearly) full length? A leg pointing toward or away from
 * the camera looks shorter in 2D, and then any angle measured with it is wrong.
 *
 * Returns each leg's mid-hip -> ankle length divided by torso length. For a real
 * person a straight leg is about 1.8-2.1 torsos long (checked on competition photos).
 * Rhythmic gymnasts often turn the shoulders and hips to the audience during a
 * split, so this is a better "camera is side-on to the split" check than body width.
 */
export function legLengthRatios(lm: Landmarks): [number, number] {
  const torso = torsoLength(lm);
  if (!torso) return [0, 0];
  const hips = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  return [dist(hips, lm[LM.L_ANKLE]) / torso, dist(hips, lm[LM.R_ANKLE]) / torso];
}

/**
 * How "wide" the body looks to the camera: average shoulder and hip width
 * divided by torso length. About 0.6-0.8 when facing the camera,
 * about 0.1-0.25 when side-on. Used to count pivot rotations and to warn
 * when the camera angle is wrong for measuring a split.
 */
export function bodyWidthRatio(lm: Landmarks): number {
  const torso = torsoLength(lm);
  if (!torso) return 0;
  const shoulders = dist(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  const hips = dist(lm[LM.L_HIP], lm[LM.R_HIP]);
  return (shoulders + hips) / 2 / torso;
}

export interface LegPoints {
  side: Side;
  hip: Landmark;
  knee: Landmark;
  ankle: Landmark;
  heel: Landmark;
  toe: Landmark;
}

/** The hip, knee, ankle, heel and toe of one leg ('L' or 'R'). */
export function legPoints(lm: Landmarks, sideKey: Side): LegPoints {
  const L = sideKey === 'L';
  return {
    side: sideKey,
    hip: lm[L ? LM.L_HIP : LM.R_HIP],
    knee: lm[L ? LM.L_KNEE : LM.R_KNEE],
    ankle: lm[L ? LM.L_ANKLE : LM.R_ANKLE],
    heel: lm[L ? LM.L_HEEL : LM.R_HEEL],
    toe: lm[L ? LM.L_FOOT : LM.R_FOOT],
  };
}

/** Shortest distance from point p to the line segment a-b. */
export function distToSegment(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const lengthSq = ab.x * ab.x + ab.y * ab.y;
  if (!lengthSq) return dist(p, a);
  const t = clamp(((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / lengthSq, 0, 1);
  return dist(p, { x: a.x + t * ab.x, y: a.y + t * ab.y });
}

/** How far a point is raised around the hip: 0 = straight down, 90 = level, 180 = straight up. */
export function legElevation(hip: Point, point: Point): number {
  return Math.abs(signedAngle({ x: 0, y: 1 }, sub(point, hip)));
}

/**
 * Signed trunk lean in degrees: positive = shoulders toward +x of the image, negative = toward -x.
 * Multiply by facingSign() to get "forward" (+) or "backward" (-) lean.
 */
export function trunkLeanX(lm: Landmarks): number {
  const hips = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  const shoulders = mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  return signedAngle({ x: 0, y: -1 }, sub(shoulders, hips));
}

/** Trunk lean from vertical in degrees (mid-hip -> mid-shoulder vs straight up). 0 = upright. */
export function trunkTilt(lm: Landmarks): number {
  const hips = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
  const shoulders = mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]);
  return Math.abs(signedAngle({ x: 0, y: -1 }, sub(shoulders, hips)));
}

/**
 * Estimated y of the top of the head. MediaPipe has no head-top point, so we take the
 * highest visible face point (nose, eyes, ears) and add 0.2 torso lengths (forehead + hair).
 */
export function headTopY(lm: Landmarks): number | null {
  const face = [LM.NOSE, LM.L_EYE, LM.R_EYE, LM.L_EAR, LM.R_EAR]
    .map((i) => lm[i])
    .filter((p) => p && (p.visibility ?? 0) >= 0.3);
  if (face.length === 0) return null;
  return Math.min(...face.map((p) => p.y)) - 0.2 * torsoLength(lm);
}

/**
 * Which way the gymnast faces along the image x axis: +1 (right), -1 (left), 0 (unknown).
 * Uses the support foot (heel -> toes); falls back to the head (ears -> nose).
 */
export function facingSign(lm: Landmarks, supportSide: Side): number {
  const torso = torsoLength(lm);
  const { heel, toe } = legPoints(lm, supportSide);
  if ((heel?.visibility ?? 0) >= 0.3 && (toe?.visibility ?? 0) >= 0.3
      && Math.abs(toe.x - heel.x) > 0.05 * torso) {
    return Math.sign(toe.x - heel.x);
  }
  const nose = lm[LM.NOSE];
  const ears = mid(lm[LM.L_EAR], lm[LM.R_EAR]);
  if ((nose?.visibility ?? 0) >= 0.3 && Math.abs(nose.x - ears.x) > 0.03 * torso) {
    return Math.sign(nose.x - ears.x);
  }
  return 0;
}

/**
 * On relevé (on the toes)? True when the heel is clearly above the toes.
 * Returns null when the foot is not visible. heelLift is in shin lengths.
 */
export function isOnReleve(
  heel: Landmark | undefined, toe: Landmark | undefined, shinLength: number, heelLift = 0.12,
): boolean | null {
  if (!heel || !toe || (heel.visibility ?? 0) < 0.3 || (toe.visibility ?? 0) < 0.3) return null;
  return toe.y - heel.y > heelLift * shinLength;
}

export interface ArmPoints {
  side: Side;
  shoulder: Landmark;
  elbow: Landmark;
  wrist: Landmark;
}

/** The shoulder, elbow and wrist of one arm ('L' or 'R'). */
export function armPoints(lm: Landmarks, sideKey: Side): ArmPoints {
  const L = sideKey === 'L';
  return {
    side: sideKey,
    shoulder: lm[L ? LM.L_SHOULDER : LM.R_SHOULDER],
    elbow: lm[L ? LM.L_ELBOW : LM.R_ELBOW],
    wrist: lm[L ? LM.L_WRIST : LM.R_WRIST],
  };
}

/**
 * How high an arm is raised, in degrees: 0 = hanging straight down, 90 = straight out to the side
 * (a T), 180 = straight up. Measured on the line shoulder -> wrist, in the image plane, so it is
 * right when the athlete faces the camera (cheer motions are shown to the crowd).
 */
export function armElevation(arm: ArmPoints): number {
  return legElevation(arm.shoulder, arm.wrist);
}

/**
 * Does the hand point AWAY from the body (out to its own side), rather than across it?
 * Compares the wrist with the shoulder, seen from the middle of the shoulders.
 */
export function armPointsOutward(lm: Landmarks, arm: ArmPoints): boolean {
  const center = mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]).x;
  const outward = Math.sign(arm.shoulder.x - center) || (arm.side === 'L' ? 1 : -1);
  return (arm.wrist.x - arm.shoulder.x) * outward >= 0;
}

/** Elbow angle, 180 = straight arm. */
export function elbowAngle(arm: ArmPoints): number {
  return jointAngle(arm.shoulder, arm.elbow, arm.wrist);
}

/** Knee angle of one leg, 180 = straight. */
export function kneeAngle(lm: Landmarks, sideKey: Side): number {
  const leg = legPoints(lm, sideKey);
  return jointAngle(leg.hip, leg.knee, leg.ankle);
}
