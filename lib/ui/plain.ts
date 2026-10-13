// Plain-language text for people who don't know the Code of Points: what went wrong, what it
// cost, and one tip. The precise rule wording stays in the report's "rulebook details".

import { round2 } from '../rules';
import type { BalanceLive } from '../elements/balances';
import type { Penalty } from '../types';

/** Friendly names by element code. */
const NAMES: Record<string, string> = {
  '2.303': 'Front split, holding the leg',
  '2.305': 'Front split, no hands',
  '2.1005': 'Back split, foot above the head',
  '2.1104': 'Back split, body forward',
  '2.1202': 'Attitude',
  '1.2103': 'Split leap',
  '2.101': 'Passé balance',
  '3.101': 'Passé turn',
};

/** Live shape keys (balances.ts SHAPES) to friendly names. */
const LIVE_NAMES: Record<string, string> = {
  frontSplitHelp: 'Front split, holding the leg',
  frontSplit: 'Front split, no hands',
  backSplitFootAboveHead: 'Back split, foot above the head',
  backSplitTrunkForward: 'Back split, body forward',
  attitude: 'Attitude',
};

export function friendlyName(event: { code: string; element: string }): string {
  return NAMES[event.code] ?? event.element;
}

// What each measured body part means, and how to fix it.
const SEGMENTS: Record<string, { problem: (deg: number | undefined) => string; tip: string }> = {
  split: { problem: (d) => `The legs were ${d}° short of a straight line.`, tip: 'Open the split more.' },
  leapSplit: { problem: (d) => `In the air, the legs were ${d}° short of a straight line.`, tip: 'Open the split more at the top of the jump.' },
  foot: { problem: (d) => `The foot was ${d}° short of being fully above the head.`, tip: 'Lift the leg higher, past the top of the head.' },
  thigh: { problem: (d) => `The raised thigh was ${d}° below hip height.`, tip: 'Lift the knee up to hip height.' },
  passeThigh: { problem: (d) => `The raised thigh was ${d}° below hip height.`, tip: 'Lift the knee up to hip height.' },
  trunk: { problem: (d) => `The upper body leaned ${d}° away from upright.`, tip: 'Stand taller and keep the chest up.' },
  trunkAbove: { problem: (d) => `The upper body was ${d}° above horizontal.`, tip: 'Bring the chest down to horizontal.' },
};

// Short words for the red tag on a move's video, next to the body part.
const SHORT: Record<string, (deg: number | undefined) => string> = {
  split: (d) => `Split ${d}° short`,
  leapSplit: (d) => `Split ${d}° short`,
  foot: (d) => `Foot ${d}° below head`,
  thigh: (d) => `Thigh ${d}° low`,
  passeThigh: (d) => `Thigh ${d}° low`,
  trunk: (d) => `Leaning ${d}°`,
  trunkAbove: (d) => `Chest ${d}° too high`,
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
  if (status === 'repeat') notes.push('Not counted again: this balance was already done earlier.');
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
    return { pose: null, dots: 0, tone: 'idle', text: plainHint(live?.hint) ?? 'Ready. Hold a front split, back split or attitude.' };
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

/** Loader line while the pose model downloads: "40%". Without a known size there is no percent. */
export function modelDownloadText(loaded: number, total: number | null): string {
  if (!total) return 'Downloading…';
  if (loaded >= total) return 'Downloaded. Starting it up…';
  return `${Math.floor((loaded / total) * 100)}%`;
}
