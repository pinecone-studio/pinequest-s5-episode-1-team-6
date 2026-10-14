// Cheerleading technique rubric: the values the cheer detectors deduct, in one place.
//
// IMPORTANT: cheerleading has no public, per-degree deduction table like the FIG Code of Points.
// Score sheets (USASF, ICU) score jumps and motions on ranges ("technique", "execution") and leave the
// numbers to the judges' eye. So the values below are OUR rubric, written from the technique those
// sheets and coaches describe (sharp, exact arm placement; straight arms; legs at least level in
// toe touches, pikes and herkies; knees up in a tuck). They are suggestions a judge can reject, and
// `verified: false` until a cheer judge or coach has checked them. Every number has a reference
// (#C1 ... #C6) into CHEER_RULE_TEXT below, never a magic number in a detector.

import { techniqueBand, type RuleText, type TechniqueBand } from '../rules';

export const CHEER_RULE_SOURCE =
  'Rhymnast cheer technique rubric (team-made from common cheer judging criteria; not an official score sheet)';

/** Shown next to every quoted cheer rule. */
const SOURCE = 'Cheer rubric';

/**
 * How far a body part is from its target, after the camera margin (same 3° as gymnastics:
 * one 2D camera measures joint angles to about ±3°). Shared with ballet: lib/rules.ts TECHNIQUE_BANDS.
 */
export const cheerBand = techniqueBand;
export type JudgedCheerBand = TechniqueBand;

/** Straight arms and legs: bent more than this is a deduction. */
export const CHEER_LIMITS = {
  straightElbowDeg: 160, // #C2: a motion's arm counts as straight at 160° or more (180 = straight)
  straightKneeDeg: 155, // #C4: a straight-leg jump's knee at 155° or more
  bentLimbPenalty: 0.1, // #C2, #C4: per arm or per leg
  jumpArmsToleranceDeg: 20, // #C6: arms within 20° of the jump's arm position (after the margin)
  jumpArmsPenalty: 0.1, // #C6
  motionMinHoldMs: 300, // a motion must be "hit" and held this long to be judged (a pass-through is not a motion)
};

/** One cheer element: its code (ours), name, difficulty value and the requirement in words. */
export interface CheerElementRule {
  code: string;
  name: string;
  value: number; // difficulty credit; motions have none (they are judged on technique only)
  requirement: string;
  ref: string;
  verified: false;
}

const jump = (code: string, name: string, value: number, requirement: string): CheerElementRule => ({
  code, name, value, requirement, ref: 'Cheer rubric #C3-#C6 (jumps)', verified: false,
});
const motion = (code: string, name: string, requirement: string): CheerElementRule => ({
  code, name, value: 0, requirement, ref: 'Cheer rubric #C1-#C2 (motions)', verified: false,
});

/**
 * Difficulty values of the jumps, relative to each other (toe touch and pike are the harder ones,
 * tuck and spread eagle the beginner ones). Not from an official sheet: see the note at the top.
 */
export const CHEER_JUMPS = {
  TOE_TOUCH: jump('CH.TOE-TOUCH', 'Toe touch', 0.3, 'Straddle in the air, both legs straight and at least level with the hips (horizontal), arms in a T. Face the camera.'),
  PIKE: jump('CH.PIKE', 'Pike jump', 0.3, 'Both legs together, straight, lifted in front to at least horizontal. Film from the side.'),
  HERKIE: jump('CH.HERKIE', 'Herkie', 0.2, 'One leg straight out to the side at least level with the hips, the other leg bent down underneath. Face the camera.'),
  TUCK: jump('CH.TUCK', 'Tuck jump', 0.1, 'Both knees pulled up to the chest, thighs at least level with the hips. Film from the side.'),
  SPREAD_EAGLE: jump('CH.SPREAD-EAGLE', 'Spread eagle', 0.1, 'Legs straight and apart in an X, arms in a High V. Face the camera.'),
};

export const CHEER_MOTIONS = {
  HIGH_V: motion('CH.HIGH-V', 'High V', 'Both arms straight, up and out at 45° above the shoulders, making a V.'),
  LOW_V: motion('CH.LOW-V', 'Low V', 'Both arms straight, down and out at 45° below the shoulders.'),
  T: motion('CH.T', 'T motion', 'Both arms straight out to the sides, level with the shoulders.'),
  TOUCHDOWN: motion('CH.TOUCHDOWN', 'Touchdown', 'Both arms straight up next to the ears.'),
  DIAGONAL: motion('CH.DIAGONAL', 'Diagonal', 'One arm in a High V, the other in a Low V, making one straight line.'),
  L_MOTION: motion('CH.L-MOTION', 'L motion', 'One arm straight up, the other straight out to the side.'),
  PUNCH: motion('CH.PUNCH', 'Punch', 'One arm punched straight up, the other hand on the hip.'),
  BROKEN_T: motion('CH.BROKEN-T', 'Broken T', 'Upper arms out to the sides at shoulder level, elbows bent, fists at the shoulders.'),
};

/** Every cheer element, by code. */
export const CHEER_ELEMENTS: Record<string, CheerElementRule> = Object.fromEntries(
  [...Object.values(CHEER_JUMPS), ...Object.values(CHEER_MOTIONS)].map((e) => [e.code, e]),
);

/**
 * The rubric sentence behind each deduction, for the report. Keys are the section names used in the
 * penalty refs ('#C1' -> 'C1'). page 0: there is no page, it is our own rubric.
 */
export const CHEER_RULE_TEXT: Record<string, RuleText> = {
  C1: {
    page: 0,
    source: SOURCE,
    text: 'Motions are judged on placement: each arm hits the exact position. Off by 10° or less: −0.10 per arm; 11-20°: −0.20; more than 20°: −0.30.',
  },
  C2: {
    page: 0,
    source: SOURCE,
    text: 'Arms in a motion are straight and locked (except bent-arm motions such as the broken T): −0.10 per bent arm.',
  },
  C3: {
    page: 0,
    source: SOURCE,
    text: 'Toe touch, pike and herkie: the legs reach at least level with the hips (horizontal) at the top of the jump. Short by 10° or less: −0.10; 11-20°: −0.20; more than 20°: −0.30, and the jump earns no difficulty.',
  },
  C4: {
    page: 0,
    source: SOURCE,
    text: 'Straight-leg jumps (toe touch, pike, herkie, spread eagle) keep the knees straight and the toes pointed: −0.10 per bent leg.',
  },
  C5: {
    page: 0,
    source: SOURCE,
    text: 'Tuck jump: both knees come up to the chest, thighs at least level with the hips. Short by 10° or less: −0.10; 11-20°: −0.20; more than 20°: −0.30, and the jump earns no difficulty.',
  },
  C6: {
    page: 0,
    source: SOURCE,
    text: 'Arms in a jump hit their position at the top: a T in a toe touch, a High V in a spread eagle. More than 20° off: −0.10.',
  },
};

/** Rubric text for a penalty ref such as '#C3 ...', or null if we have none. */
export function cheerRuleTextFor(ref: string | null | undefined): RuleText | null {
  const section = /#(C\d+)/.exec(ref ?? '')?.[1];
  return section ? CHEER_RULE_TEXT[section] ?? null : null;
}

/** Things the cheer judges still score themselves (shown in the report). */
export const CHEER_NOT_JUDGED = [
  'Stunts, pyramids, tosses and tumbling: entered by the judges as extra difficulty and execution.',
  'Showmanship, facial expression, voice and crowd appeal: entered by the judges.',
  'Synchronization between athletes: the app follows one athlete at a time.',
  'The values are a team-made technique rubric, not an official score sheet: every call above can be rejected.',
];
