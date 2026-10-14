// Ballet technique rubric: the values the ballet detectors deduct, in one place.
//
// IMPORTANT: ballet has no per-degree deduction table. Competitions (YAGP, Prix de Lausanne) and
// exams (RAD, Cecchetti, Vaganova) are judged by eye on technique and artistry. So the values below
// are OUR rubric, written from what ballet teachers correct in class: legs at least at 90° in
// extensions, straight knees, a placed and lifted trunk, the toe at the knee in retiré, even knees in
// plié, a 180° split in a grand jeté, pirouettes on demi-pointe. They are suggestions a teacher or
// judge can reject, and `verified: false` until a ballet teacher has checked them. Every number has a
// reference (#B1 ... #B8) into BALLET_RULE_TEXT below, never a magic number in a detector.

import { techniqueBand, type RuleText, type TechniqueBand } from '../rules';

export const BALLET_RULE_SOURCE =
  'Rhymnast ballet technique rubric (team-made from common classical ballet corrections; not an official syllabus or score sheet)';

const SOURCE = 'Ballet rubric';

/** Degrees off a target: ≤10° −0.10, 11-20° −0.20, more than 20° −0.30, after the 3° camera margin. */
export const balletBand = (measuredDeviationDeg: number): TechniqueBand => techniqueBand(measuredDeviationDeg);

export const BALLET_LIMITS = {
  extensionDeg: 90, // #B1: the working leg (or the thigh, in attitude) at least at 90°
  straightKneeDeg: 160, // #B2: a straight leg at 160° or more (180 = straight)
  bentLegPenalty: 0.1, // #B2: per bent leg
  // #B3: the trunk may lean this much before it is a deduction. An arabesque tilts the back forward
  // naturally as the leg rises (more in a high arabesque); an attitude a little; the rest stand upright.
  trunkAllowanceDeg: { arabesque: 25, attitude: 15, devant: 5, seconde: 5, retire: 5, plie: 5 },
  minHoldMs: 1000, // #B4: a balance is held at least 1 second
  shortHoldPenalty: 0.2, // #B4
  minPoseMs: 700, // shorter = a movement passing through the pose, not judged at all (team videos, 2026-10-14)
  // #B5: retiré, the toe at the knee. How far the foot is below the knee, in % of a shin length.
  retireFootBands: [
    { maxPct: 15, penalty: 0 }, // at the knee (includes the camera margin)
    { maxPct: 30, penalty: 0.1 },
    { maxPct: 45, penalty: 0.2 },
    { maxPct: Infinity, penalty: 0.3 },
  ],
  uneven: { toleranceDeg: 10, penalty: 0.1 }, // #B6: plié, both knees bent the same (after the margin)
  incompleteTurnPenalty: 0.3, // #B8: a pirouette under one full turn
  flatTurnPenalty: 0.1, // #B8: a pirouette mostly on a flat foot
  releveMinShare: 0.6, // #B8: on demi-pointe for at least 60% of the turn
};

/** #B5: the deduction for a retiré foot this far below the knee (% of a shin length). */
export function retireFootPenalty(pctBelowKnee: number): number {
  return BALLET_LIMITS.retireFootBands.find((b) => pctBelowKnee <= b.maxPct)!.penalty;
}

/** One ballet element: its code (ours), name, difficulty value and the requirement in words. */
export interface BalletElementRule {
  code: string;
  name: string;
  value: number; // difficulty credit: poses have none (technique only), turns and jumps do
  requirement: string;
  ref: string;
  verified: false;
}

const pose = (code: string, name: string, requirement: string, ref: string): BalletElementRule => ({
  code, name, value: 0, requirement, ref, verified: false,
});

/** Held poses, recognized by the ballet pose library (lib/ballet/library.ts). */
export const BALLET_POSES = {
  ARABESQUE: pose('BA.ARABESQUE', 'Arabesque',
    'Standing leg straight; working leg straight behind at 90° or higher; back lifted (a slight forward tilt is allowed). Film from the side.',
    'Ballet rubric #B1-#B4'),
  ATTITUDE: pose('BA.ATTITUDE', 'Attitude',
    'Standing leg straight; working thigh behind at 90° or higher, knee bent; trunk upright. Film from the side.',
    'Ballet rubric #B1-#B4'),
  DEVANT: pose('BA.DEVANT', 'Développé devant',
    'Working leg straight in front at 90° or higher; standing leg straight; trunk upright. Film from the side.',
    'Ballet rubric #B1-#B4'),
  SECONDE: pose('BA.SECONDE', 'À la seconde',
    'Working leg straight to the side at 90° or higher; standing leg straight; trunk upright. Face the camera.',
    'Ballet rubric #B1-#B4'),
  RETIRE: pose('BA.RETIRE', 'Retiré balance',
    'Toe of the working leg at the standing knee; standing leg straight; trunk upright; held at least 1 second.',
    'Ballet rubric #B2-#B5'),
  PLIE: pose('BA.PLIE', 'Plié',
    'Both knees bent the same amount over the toes, trunk upright. Face the camera.',
    'Ballet rubric #B3, #B6'),
};

export const BALLET_MOVES = {
  PIROUETTE: {
    code: 'BA.PIROUETTE', name: 'Pirouette', value: 0.1, perExtraTurn: 0.1,
    requirement: 'Turn in retiré (toe at the knee) on demi-pointe, at least one full turn. Each extra turn adds difficulty.',
    ref: 'Ballet rubric #B5, #B8', verified: false as const,
  },
  GRAND_JETE: {
    code: 'BA.GRAND-JETE', name: 'Grand jeté', value: 0.2, requiredSplitDeg: 180,
    requirement: 'A big jump from one leg to the other with the legs in a 180° split at the top. Film from the side.',
    ref: 'Ballet rubric #B7', verified: false as const,
  },
};

/** Every ballet element by code (name lookups for the plain texts). */
export const BALLET_ELEMENTS: Record<string, { code: string; name: string }> = Object.fromEntries(
  [...Object.values(BALLET_POSES), ...Object.values(BALLET_MOVES)].map((e) => [e.code, e]),
);

/**
 * The rubric sentence behind each deduction, for the report. Keys are the section names used in the
 * penalty refs ('#B1' -> 'B1'). page 0: our own rubric has no pages.
 */
export const BALLET_RULE_TEXT: Record<string, RuleText> = {
  B1: {
    page: 0, source: SOURCE,
    text: 'Extensions (arabesque, attitude, développé devant, à la seconde): the working leg (in attitude, the thigh) reaches at least 90°. Short by 10° or less: −0.10; 11-20°: −0.20; more than 20°: −0.30.',
  },
  B2: {
    page: 0, source: SOURCE,
    text: 'Straight legs: the standing leg is pulled up straight, and so is the working leg in arabesque, développé and à la seconde. −0.10 per bent leg (knee under 160°).',
  },
  B3: {
    page: 0, source: SOURCE,
    text: 'Placement: the trunk is lifted and upright. An arabesque may tilt forward up to 25°, an attitude up to 15°; beyond that (or beyond 5° in the other poses): 10° or less −0.10, 11-20° −0.20, more than 20° −0.30.',
  },
  B4: {
    page: 0, source: SOURCE,
    text: 'Balances are held at least 1 second: −0.20 when shorter.',
  },
  B5: {
    page: 0, source: SOURCE,
    text: 'Retiré: the toe of the working leg is at the standing knee. Below it by more than 15% of a shin length: −0.10; more than 30%: −0.20; more than 45%: −0.30.',
  },
  B6: {
    page: 0, source: SOURCE,
    text: 'Plié: both knees bend the same amount. More than 10° apart: −0.10.',
  },
  B7: {
    page: 0, source: SOURCE,
    text: 'Grand jeté: the legs reach a 180° split at the top of the jump. Short by 10° or less: −0.10; 11-20°: −0.20; more than 20°: −0.30, and the jump earns no difficulty.',
  },
  B8: {
    page: 0, source: SOURCE,
    text: 'Pirouette: at least one full turn (less: −0.30 and no difficulty), turned on demi-pointe (mostly on a flat foot: −0.10).',
  },
};

/** Rubric text for a penalty ref such as '#B3 ...', or null if we have none. */
export function balletRuleTextFor(ref: string | null | undefined): RuleText | null {
  const section = /#(B\d+)/.exec(ref ?? '')?.[1];
  return section ? BALLET_RULE_TEXT[section] ?? null : null;
}

/** Things the ballet teachers / judges still score themselves (shown in the report). */
export const BALLET_NOT_JUDGED = [
  'Turnout, pointed feet, port de bras (arms), épaulement and the five positions of the feet: entered by the teacher or judges.',
  'Musicality, artistry and expression: entered by the judges.',
  'Pas de deux and partnering: the app follows one dancer at a time.',
  'The values are a team-made technique rubric, not an official syllabus or score sheet: every call above can be rejected.',
];
