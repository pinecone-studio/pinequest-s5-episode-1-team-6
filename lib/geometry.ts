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
