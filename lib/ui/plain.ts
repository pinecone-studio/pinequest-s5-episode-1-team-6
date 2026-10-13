// Plain-language text for people who don't know the Code of Points: what went wrong, what it
// cost, and one tip. The precise rule wording stays in the report's "rulebook details".

import { round2 } from '../rules';
import type { BalanceLive } from '../elements/balances';
import type { MotionLive } from '../cheer/motions';
import type { BalletPoseLive } from '../ballet/poses';
import { BALLET_POSE_NAMES } from '../ballet/library';
import { CHEER_ELEMENTS } from '../cheer/rules';
import type { Penalty } from '../types';

/** Friendly names by element code. */
const NAMES: Record<string, string> = {
  '2.303': 'Front split, holding the leg',
  '2.305': 'Front split, no hands',
  '2.1005': 'Back split, foot above the head',
  '2.1104': 'Back split, body forward',
  '2.902': 'Arabesque',
  '2.1202': 'Attitude',
  '1.2103': 'Split leap',
  '1.2702': 'Stag leap',
  '3.1203': 'Attitude turn',
  '2.101': 'Passé balance',
  '3.101': 'Passé turn',
};

/** Live shape keys (balances.ts SHAPES) to friendly names. */
const LIVE_NAMES: Record<string, string> = {
  frontSplitHelp: 'Front split, holding the leg',
  frontSplit: 'Front split, no hands',
  backSplitFootAboveHead: 'Back split, foot above the head',
  backSplitTrunkForward: 'Back split, body forward',
  arabesque: 'Arabesque',
  attitude: 'Attitude',
};

export function friendlyName(event: { code: string; element: string }): string {
  return NAMES[event.code] ?? CHEER_ELEMENTS[event.code]?.name ?? event.element;
}

/** Cheer arm mistakes: 'leftArmLow' -> problem and tip. */
function armSegment(side: 'left' | 'right', low: boolean) {
  return {
    problem: (d: number | undefined) => `The ${side} arm was ${d}° ${low ? 'too low' : 'too high'}.`,
    tip: low ? `Lift the ${side} arm a little higher and lock it there.` : `Bring the ${side} arm down a little and lock it there.`,
  };
}

// What each measured body part means, and how to fix it.
const SEGMENTS: Record<string, { problem: (deg: number | undefined) => string; tip: string }> = {
  split: { problem: (d) => `The legs were ${d}° short of a straight line.`, tip: 'Open the split more.' },
  leapSplit: { problem: (d) => `In the air, the legs were ${d}° short of a straight line.`, tip: 'Open the split more at the top of the jump.' },
  leapStag: { problem: (d) => `In the air, the front thigh and the back leg were ${d}° short of a straight line.`, tip: 'Lift the front knee and stretch the back leg further at the top of the jump.' },
  foot: { problem: (d) => `The foot was ${d}° short of being fully above the head.`, tip: 'Lift the leg higher, past the top of the head.' },
  thigh: { problem: (d) => `The raised thigh was ${d}° below hip height.`, tip: 'Lift the knee up to hip height.' },
  passeThigh: { problem: (d) => `The raised thigh was ${d}° below hip height.`, tip: 'Lift the knee up to hip height.' },
  trunk: { problem: (d) => `The upper body leaned ${d}° away from upright.`, tip: 'Stand taller and keep the chest up.' },
  trunkAbove: { problem: (d) => `The upper body was ${d}° above horizontal.`, tip: 'Bring the chest down to horizontal.' },
  // Cheer
  leftArmLow: armSegment('left', true),
  leftArmHigh: armSegment('left', false),
  rightArmLow: armSegment('right', true),
  rightArmHigh: armSegment('right', false),
  leftElbow: { problem: (d) => `The left arm was bent by ${d}°.`, tip: 'Lock the left elbow straight.' },
  rightElbow: { problem: (d) => `The right arm was bent by ${d}°.`, tip: 'Lock the right elbow straight.' },
  jumpLegs: { problem: (d) => `At the top of the jump, the legs were ${d}° below hip height.`, tip: 'Lift the legs higher: kick up to hip height or above.' },
  tuckKnees: { problem: (d) => `At the top of the jump, the knees were ${d}° below hip height.`, tip: 'Pull the knees up to the chest.' },
  jumpKnees: { problem: (d) => `A knee was bent by ${d}° in the air.`, tip: 'Keep the legs straight and point the toes.' },
  jumpArms: { problem: (d) => `In the air, the arms were ${d}° off their position.`, tip: 'Hit the arm position at the top of the jump.' },
  // Ballet
  legHeight: { problem: (d) => `The working leg was ${d}° below 90°.`, tip: 'Lift the leg higher: reach for 90° or above.' },
  workingKnee: { problem: (d) => `The working leg was bent by ${d}°.`, tip: 'Stretch the working knee and point the foot.' },
  supportKnee: { problem: (d) => `The standing leg was bent by ${d}°.`, tip: 'Pull up the standing knee.' },
  balletTrunk: { problem: (d) => `The upper body leaned ${d}° more than allowed.`, tip: 'Lift the chest and keep the back placed.' },
  retireFoot: { problem: (d) => `The foot was ${d}% of a shin length below the knee.`, tip: 'Bring the toe up to the knee.' },
  kneesUneven: { problem: (d) => `The knees were bent ${d}° differently.`, tip: 'Bend both knees the same amount, over the toes.' },
  turnShort: { problem: (d) => `The turn was ${d}° short of a full turn.`, tip: 'Spot and finish the whole turn.' },
  flatTurn: { problem: () => 'The turn was done mostly on a flat foot.', tip: 'Rise onto demi-pointe for the whole turn.' },
};

// Short words for the red tag on a move's video, next to the body part.
const SHORT: Record<string, (deg: number | undefined) => string> = {
  split: (d) => `Split ${d}° short`,
  leapSplit: (d) => `Split ${d}° short`,
  leapStag: (d) => `Stag ${d}° short`,
  foot: (d) => `Foot ${d}° below head`,
  thigh: (d) => `Thigh ${d}° low`,
  passeThigh: (d) => `Thigh ${d}° low`,
  trunk: (d) => `Leaning ${d}°`,
  trunkAbove: (d) => `Chest ${d}° too high`,
  leftArmLow: (d) => `Left arm ${d}° low`,
  leftArmHigh: (d) => `Left arm ${d}° high`,
  rightArmLow: (d) => `Right arm ${d}° low`,
  rightArmHigh: (d) => `Right arm ${d}° high`,
  leftElbow: (d) => `Left arm bent ${d}°`,
  rightElbow: (d) => `Right arm bent ${d}°`,
  jumpLegs: (d) => `Legs ${d}° low`,
  tuckKnees: (d) => `Knees ${d}° low`,
  jumpKnees: (d) => `Knee bent ${d}°`,
  jumpArms: (d) => `Arms ${d}° off`,
  legHeight: (d) => `Leg ${d}° low`,
  workingKnee: (d) => `Leg bent ${d}°`,
  supportKnee: (d) => `Standing knee bent ${d}°`,
  balletTrunk: (d) => `Leaning ${d}° too much`,
  retireFoot: (d) => `Foot ${d}% below knee`,
  kneesUneven: (d) => `Knees ${d}° uneven`,
  turnShort: (d) => `${d}° short of a turn`,
  flatTurn: () => 'Flat foot',
};

/** "Thigh 6° low −0.10": the tag on a move's video. */
export function mistakeLabel(p: Pick<Penalty, 'segment' | 'value'> & Partial<Penalty>): string {
  const what = p.segment === 'hold'
    ? `Held ${((p.holdMs ?? 0) / 1000).toFixed(1)} s, needs 1 s`
    : SHORT[p.segment]?.(p.measuredDeg) ?? p.reason ?? 'Mistake';
  return `${what}  −${p.value.toFixed(2)}`;
}

export interface Explanation {
  text: string;
  tip: string | null;
  value: number;
}

/** One deduction in plain words. Accepts full penalties and the short live ones. */
export function explainPenalty(p: Pick<Penalty, 'segment' | 'value'> & Partial<Penalty>): Explanation {
  if (p.segment === 'hold') {
    return {
      text: `Held for ${((p.holdMs ?? 0) / 1000).toFixed(1)} seconds; a balance must be held for at least 1 second.`,
      tip: 'Hold the position a little longer.',
      value: p.value,
    };
  }
  const s = SEGMENTS[p.segment];
  if (s) return { text: s.problem(p.measuredDeg), tip: s.tip, value: p.value };
  return { text: p.reason ?? '', tip: null, value: p.value };
}

export type Tone = 'good' | 'warn' | 'bad';

export interface MoveDescription {
  name: string;
  pointsLost: number;
  result: string;
  tone: Tone;
  reasons: Explanation[];
  notes: string[];
}

/** The fields describeMove() reads: an element event, or a report move (deductions instead of penalties). */
export interface DescribableMove {
  code: string;
  element: string;
  penalties?: Penalty[];
  deductions?: Penalty[];
  flatFoot?: boolean;
  dbValid?: boolean;
  lowConfidence?: boolean;
}

/**
 * Everything a list row or card needs about one judged move.
 * @param status optional scoreboard status ('counted', 'repeat', ...)
 */
export function describeMove(event: DescribableMove, status?: string): MoveDescription {
  const penalties = event.penalties ?? event.deductions ?? [];
  const pointsLost = round2(penalties.reduce((sum, p) => sum + p.value, 0));
  const reasons = penalties.map(explainPenalty);
  const notes: string[] = [];
  if (event.flatFoot) notes.push('Done on a flat foot: this balance is worth 0.10 less. Rise onto the toes.');
  if (status === 'repeat') notes.push('Not counted again: this move was already done earlier.');
  if (event.dbValid === false || status === 'not valid') notes.push('Too far from the required shape to count as a difficulty.');
  if (event.lowConfidence) notes.push('The camera was unsure about the raised leg: worth a second look.');
  return {
    name: friendlyName(event),
    pointsLost,
    result: pointsLost === 0 ? 'No points lost' : `${pointsLost.toFixed(2)} points lost`,
    tone: pointsLost === 0 ? 'good' : pointsLost >= 0.5 ? 'bad' : 'warn',
    reasons,
    notes,
  };
}

/** Technical hints from the detector in everyday words. */
const HINTS: Record<string, string> = {
  'Step into the camera view': 'Step in front of the camera.',
  'Whole body and both feet must be in view': 'Step back so your whole body and both feet are in the picture.',
  'Turn side-on to the camera': 'Turn sideways to the camera.',
  'Turn side-on: a leg points at the camera': 'Turn sideways: one leg is pointing at the camera.',
  'Pose not recognized': 'Hold the shape still so the app can recognize it.',
  'Head not visible: move back from the camera': 'Step back so your head is in the picture.',
  'Raised leg not visible: try a plain background and contrasting clothes': 'The camera can\'t see your raised leg. A plain, light background helps.',
  'Face the camera': 'Face the camera so it can see both arms.',
  'Face the camera for pliés': 'Face the camera for pliés, so it can see both knees.',
  'Arms not visible: step back from the camera': 'Step back so both arms are in the picture, even straight up.',
};

export function plainHint(hint: string | null | undefined): string | null | undefined {
  return hint == null ? hint : HINTS[hint] ?? hint;
}

export interface LiveMessage {
  pose: string | null;
  dots: number; // 0..4
  tone: Tone | 'idle';
  text: string;
}

/** What to say on the video right now. Takes balance.live from BalanceDetector (or part of it). */
export function liveMessage(live: Partial<BalanceLive> | null | undefined): LiveMessage {
  if (!live?.shape) {
    return { pose: null, dots: 0, tone: 'idle', text: plainHint(live?.hint) ?? 'Ready. Hold a balance, do a stag leap or an attitude turn.' };
  }
  const dots = Math.min(4, Math.floor(((live.holdMs ?? 0) / 1000) * 4));
  const worst = [...(live.penalties ?? [])].sort((a, b) => b.value - a.value)[0];
  if (!worst) {
    return { pose: LIVE_NAMES[live.shape] ?? live.label ?? null, dots, tone: 'good', text: dots < 4 ? 'Looks good. Keep holding…' : 'Looks good ✓' };
  }
  const e = explainPenalty(worst);
  return {
    pose: LIVE_NAMES[live.shape] ?? live.label ?? null,
    dots,
    tone: worst.value >= 0.5 ? 'bad' : 'warn',
    text: `${e.tip} (−${worst.value.toFixed(2)})`,
  };
}

/** Cheer: what to say on the video right now. Takes motion.live (lib/cheer/motions.ts). */
export function cheerLiveMessage(motion: MotionLive, airborne: boolean): LiveMessage {
  if (airborne) return { pose: 'Jump', dots: 0, tone: 'idle', text: 'In the air…' };
  if (!motion.shape) return { pose: null, dots: 0, tone: 'idle', text: plainHint(motion.hint) ?? 'Ready. Hit a motion or do a jump.' };
  const worst = [...motion.penalties].sort((a, b) => b.value - a.value)[0];
  if (!worst) return { pose: motion.name, dots: 0, tone: 'good', text: 'Right on target ✓' };
  const e = explainPenalty(worst);
  return { pose: motion.name, dots: 0, tone: worst.value >= 0.3 ? 'bad' : 'warn', text: `${e.tip} (−${worst.value.toFixed(2)})` };
}

/** Ballet: what to say on the video right now (the pose detector's live view and the turn). */
export function balletLiveMessage(pose: BalletPoseLive, airborne: boolean, turnDeg: number | null): LiveMessage {
  if (turnDeg !== null) {
    const deg = Math.round(turnDeg);
    return { pose: 'Pirouette', dots: 0, tone: deg >= 360 ? 'good' : 'idle', text: deg >= 360 ? `Full turn ✓ (${deg}°)` : `Turning… ${deg}°` };
  }
  if (airborne) return { pose: 'Jump', dots: 0, tone: 'idle', text: 'In the air…' };
  if (!pose.pose) return { pose: null, dots: 0, tone: 'idle', text: plainHint(pose.hint) ?? 'Ready. Hold a pose, turn a pirouette or do a grand jeté.' };
  const name = BALLET_POSE_NAMES[pose.pose];
  // A plié is a movement, not a balance: no hold dots.
  const dots = pose.pose === 'plie' ? 0 : Math.min(4, Math.floor((pose.holdMs / 1000) * 4));
  const worst = [...pose.penalties].sort((a, b) => b.value - a.value)[0];
  if (!worst) return { pose: name, dots, tone: 'good', text: dots < 4 && pose.pose !== 'plie' ? 'Looks good. Keep holding…' : 'Looks good ✓' };
  const e = explainPenalty(worst);
  return { pose: name, dots, tone: worst.value >= 0.3 ? 'bad' : 'warn', text: `${e.tip} (−${worst.value.toFixed(2)})` };
}

/** What to say on the video while she turns in an attitude. */
export function pivotMessage(rotationDeg: number): { pose: string; tone: Tone | 'idle'; text: string } {
  const deg = Math.round(rotationDeg);
  return deg >= 360
    ? { pose: 'Attitude turn', tone: 'good', text: `Full turn ✓ (${deg}°)` }
    : { pose: 'Attitude turn', tone: 'idle', text: `Turning… ${deg}°` };
}

/** Loader line while the pose model downloads: "40%". Without a known size there is no percent. */
export function modelDownloadText(loaded: number, total: number | null): string {
  if (!total) return 'Downloading…';
  if (loaded >= total) return 'Downloaded. Starting it up…';
  return `${Math.floor((loaded / total) * 100)}%`;
}
