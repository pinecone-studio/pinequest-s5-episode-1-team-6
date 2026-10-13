// Rule values from the FIG Rhythmic Gymnastics Code of Points 2025-2028
// (mark-up version, valid from 1 April 2025). "p. N" = page N of that PDF.
// Every number here must have a reference. See docs/rules.md for the quoted text.

import type { Band } from './types';

export const RULE_SOURCE =
  'FIG Rhythmic Gymnastics Code of Points 2025-2028 (valid from 1 April 2025)';

interface DeviationBand {
  band: Band;
  maxDeg: number;
  penalty: number;
  dbValid: boolean;
  ref: string;
}

/**
 * Shape deviation bands, Difficulty #2.5.2-2.5.4 (p. 25).
 * The Code says (p. 26) the angles are a guideline for judges, so the app
 * shows these as SUGGESTIONS that a judge can reject.
 */
export const DEVIATION_BANDS: DeviationBand[] = [
  { band: 'none', maxDeg: 0, penalty: 0, dbValid: true, ref: '#2.5.1 p.25' },
  { band: 'small', maxDeg: 10, penalty: 0.1, dbValid: true, ref: '#2.5.2 p.25' },
  { band: 'medium', maxDeg: 20, penalty: 0.3, dbValid: true, ref: '#2.5.3 p.25' },
  { band: 'large', maxDeg: Infinity, penalty: 0.5, dbValid: false, ref: '#2.5.4 p.25' },
];

export interface BandResult extends DeviationBand {
  deg: number;
}

/** Band for a deviation in degrees. Rounded first: CoP uses "10° or less", "11-20°". */
export function deviationBand(deviationDeg: number): BandResult {
  const deg = Math.max(0, Math.round(deviationDeg));
  return { deg, ...DEVIATION_BANDS.find((b) => deg <= b.maxDeg)! };
}

/**
 * Camera measurement margin. One 2D camera measures joint angles to about ±3°, and the Code says
 * the angles are "just a guideline" for judges (p. 26). So the gymnast gets the benefit of the doubt:
 * the first 3° of a measured deviation are not deducted.
 */
export const MEASUREMENT_MARGIN_DEG = 3;

export interface JudgedBand extends BandResult {
  measuredDeg: number;
}

/** Band for a MEASURED deviation, after the camera margin. `measuredDeg` keeps the raw value. */
export function judgedBand(measuredDeviationDeg: number, margin = MEASUREMENT_MARGIN_DEG): JudgedBand {
  const measuredDeg = Math.max(0, Math.round(measuredDeviationDeg));
  return { ...deviationBand(measuredDeviationDeg - margin), measuredDeg };
}

/** Difficulty components, Difficulty #1.5 (p. 21): highest 8 DB counted. */
export const MAX_DB_COUNTED = 8;

/** Final score = D + A + E, penalties deducted from it. General #5.2 (p. 12). */
export const E_MAX = 10;
export const A_MAX = 10;

export const ELEMENTS = {
  SPLIT_LEAP: {
    code: '1.2103',
    name: 'Split leap',
    // Table of jump/leap difficulties #9, item 21 (p. 76-78); value column 0.30.
    // Matches the example "DB valid: 0.30 p." in #8.1.2 (p. 72).
    value: 0.3,
    // "A split position of 180° is required at the highest point of the leap." (p. 74)
    requiredSplitDeg: 180,
    requirement: 'A split position of 180° is required at the highest point of the leap. (Table #9, p. 74)',
    ref: 'Jumps #8.1, #9 item 21 (p. 72-78); deviations #2.5 (p. 25)',
  },
  STAG_LEAP: {
    code: '1.2702',
    name: 'Stag leap',
    // Table of jump/leap difficulties #9, item 27 "Stag leap, take-off from 1 or 2 feet, also with
    // ring/back bend of the trunk" (p. 80): 1.2702 (0.20) plain, 1.2704 (0.40) with ring/back bend.
    value: 0.2,
    // "The front leg must be maximally bent, foot close to the thigh. The legs must be 180° apart" (p. 75)
    requiredSplitDeg: 180,
    requirement: 'Stag leap: "The front leg must be maximally bent, foot close to the thigh. The legs must be 180° apart, the stag position may be horizontal and will also be accepted when the 180° position is maintained with 1 of the legs above and the other below a horizontal position." (Technique, p. 75)',
    verified: false,
    ref: 'Jumps #8.1, technique p. 75, #9 item 27 (p. 80); deviations #2.5 (p. 25)',
  },
  PASSE_BALANCE: {
    code: '2.101',
    name: 'Passé balance',
    // Table of balance difficulties #11, item 1 (p. 88): 0.10.
    value: 0.1,
    // Passé = free thigh "horizontal position" (p. 88).
    requiredThighDeg: 90,
    requirement: 'Passé forward or side, thigh in horizontal position; stop position held for a minimum of 1 second. (#10.1.2, table #11 p. 88)',
    // "Stop position fixed in the shape for a minimum of 1 second" (#10.1.2).
    minHoldMs: 1000,
    // Held less than 1 s: valid, Execution penalty 0.30 (#10.2.2, p. 84).
    shortHoldPenalty: 0.3,
    // On flat foot the value is reduced by 0.10 (#10.3, p. 84).
    flatFootReduction: 0.1,
    ref: 'Balances #10.1-10.3 (p. 84), #11 item 1 (p. 88); deviations #2.5 (p. 25)',
  },
  PASSE_PIVOT: {
    code: '3.101',
    name: 'Passé pivot',
    // Table of rotation difficulties #13, item 1 (p. 98): 0.10 for 360°.
    value: 0.1,
    requiredThighDeg: 90,
    requirement: 'Passé forward or side (horizontal position), minimum basic rotation 360° on relevé. (#12.1.2, table #13 p. 98)',
    baseRotationDeg: 360, // #12.1.2
    // +0.10 per additional rotation for pivots with base value 0.10 (#12.2.5, p. 92).
    perExtraRotation: 0.1,
    ref: 'Rotations #12.1-12.2 (p. 91-92), #13 item 1 (p. 98); deviations #2.5 (p. 25)',
  },
};

/** Rules shared by all balances on the foot (#10.1.2, #10.2.2, #10.3, p. 82-84). */
export const BALANCE_RULES = {
  minHoldMs: 1000, // "Stop position fixed in the shape for a minimum of 1 second"
  shortHoldPenalty: 0.3, // held < 1 s: valid, E 0.30 (#10.2.2, p. 84)
  flatFootReduction: 0.1, // on flat foot the value is reduced by 0.10 (#10.3, p. 84)
};

/** One difficulty from the balance table: code, name and value. */
export interface BalanceVariant {
  code: string;
  name: string;
  value: number;
}

export interface BalanceRule {
  box: string;
  requirement: string;
  verified: boolean;
  ref: string;
  requiredSplitDeg?: number;
  requiredThighDeg?: number;
}

// The balances the team focuses on. VALUES NOT YET VERIFIED (verified: false):
// the PDF text does not say which pictogram sits in which value column, so each value is
// mapped by the order of the variants in the row title. A teammate must check p. 88-89.
// `box` = the table row; a difficulty from the same box can only count once (#2.4.1).
export const BALANCES = {
  FRONT_SPLIT: {
    box: '2.3',
    // Table #11 row 3 "Front split with or without help" (p. 88): codes 2.303 and 2.305.
    withHelp: { code: '2.303', name: 'Front split balance with help', value: 0.3 },
    withoutHelp: { code: '2.305', name: 'Front split balance without help', value: 0.5 },
    // "Split is required" (technique, p. 86).
    requiredSplitDeg: 180,
    requirement: 'Front split with or without help: "Split is required". (Technique, p. 86)',
    verified: false,
    ref: 'Balances #10 (p. 82-84), technique p. 86, table #11 row 3 (p. 88)',
  },
  BACK_SPLIT: {
    box: '2.10',
    // Table #11 row 10 "Back split with help, also foot above head without help" (p. 89).
    // "Back split with help: Split is required. Touching is NOT required" (p. 86).
    // Not scored by the app (looks like other shapes in 2D), kept for reference.
    withHelp: { code: '2.1003', name: 'Back split balance with help', value: 0.3 },
    // "Free leg high up backward, without help: Split is NOT required;
    //  whole foot above the head is required. Touching is NOT required" (p. 87).
    footAboveHead: { code: '2.1005', name: 'Back split balance without help', value: 0.5 },
    requiredSplitDeg: 180,
    requirement: 'Free leg high up backward, without help: "Split is NOT required; whole foot above the head is required. Touching is NOT required." (Technique, p. 87)',
    verified: false,
    ref: 'Balances #10 (p. 82-84), technique p. 86-87, table #11 row 10 (p. 89)',
  },
  BACK_SPLIT_TRUNK_FORWARD: {
    box: '2.11',
    // Table #11 row 11 "Back split with or without help, trunk forward at the horizontal or below,
    // or with ring without help" (p. 89): codes 2.1104 (0.40) and 2.1106 (0.60, the ring variant).
    plain: { code: '2.1104', name: 'Back split balance, trunk forward', value: 0.4 },
    requiredSplitDeg: 180,
    // The balance table gives no separate technique text; the matching rotation (p. 97) defines the
    // shape: "Split position required. The trunk should remain at the horizontal or below."
    requirement: 'Back split, trunk forward at the horizontal or below (table #11 row 11, p. 89): split position required; the trunk at the horizontal or below (same shape as the rotation, p. 97).',
    verified: false,
    ref: 'Balances #10 (p. 82-84), table #11 row 11 (p. 89), shape as rotation p. 97',
  },
  ARABESQUE: {
    box: '2.9',
    // Table #11 row 9 "Arabesque: Free leg horizontal backward, also with trunk forward at the horizontal,
    // also with back bend of the trunk" (p. 89): 2.902, 2.903, 2.904. We assume the plain arabesque =
    // 0.20 (first in the row title); trunk forward (0.30) and back bend (0.40) are not detected.
    plain: { code: '2.902', name: 'Arabesque balance', value: 0.2 },
    // "Free leg horizontal forward (straight or bent), side, or backward (Arabesque): Horizontal
    //  position of the free leg (thigh) and the maximum vertical position of the body" (p. 86).
    requiredThighDeg: 90,
    requirement: 'Arabesque: "Horizontal position of the free leg (thigh) and the maximum vertical position of the body". (Technique, p. 86)',
    verified: false,
    ref: 'Balances #10 (p. 82-84), technique p. 86, table #11 row 9 (p. 89)',
  },
  ATTITUDE: {
    box: '2.12',
    // Table #11 row 12 "Attitude, also ring with help ..." (p. 89): 2.1202 = 0.20 for the
    // plain attitude (0.30 / 0.40 are the ring variants, not detected).
    plain: { code: '2.1202', name: 'Attitude balance', value: 0.2 },
    // "Horizontal position of the free leg (thigh) and the maximum vertical position of
    //  the body" (p. 87).
    requiredThighDeg: 90,
    requirement: 'Attitude: "Horizontal position of the free leg (thigh) and the maximum vertical position of the body". (Technique, p. 87)',
    verified: false,
    ref: 'Balances #10 (p. 82-84), technique p. 87, table #11 row 12 (p. 89)',
  },
} satisfies Record<string, BalanceRule & Record<string, unknown>>;

/** Round to 2 decimals (scores are in hundredths). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface RuleText {
  page: number;
  text: string;
}

/**
 * The rulebook sentence behind each deduction, for the end-of-routine report.
 * Keys are the section numbers used in penalty `ref`s (e.g. '#2.5.3 p.25' -> '2.5.3').
 */
export const RULE_TEXT: Record<string, RuleText> = {
  '2.5.2': {
    page: 25,
    text: 'When the shape is recognizable with a small deviation of 10° or less of 1 or more of the body segments, the DB is valid with an Execution penalty: 0.10 p. for each incorrect body segment.',
  },
  '2.5.3': {
    page: 25,
    text: 'When the shape is recognizable with a medium deviation of 11-20° of 1 or more of the body segments, the DB is valid with an Execution penalty: 0.30 p. for each incorrect body segment.',
  },
  '2.5.4': {
    page: 25,
    text: 'When the shape is not sufficiently recognizable with a large deviation of more than 20° of 1 or more of the body segments, the DB is not valid and receives an Execution penalty: 0.50 p. for each incorrect body segment.',
  },
  '10.2.2': {
    page: 84,
    text: 'If the shape of the balance is well-defined but the stop position is insufficient (less than 1 second), the balance is valid with an Execution penalty: 0.30 p. "shape not held for a minimum 1 second".',
  },
  '10.3': {
    page: 84,
    text: 'Balances on the foot may be performed on the toes on relevé or on flat foot. For flat foot, the value of the Difficulty is reduced by 0.10 p.',
  },
};

/** Rulebook text for a penalty ref such as '#2.5.3 p.25', or null if we have none. */
export function ruleTextFor(ref: string | null | undefined): RuleText | null {
  const section = /#(\d+(?:\.\d+)*)/.exec(ref ?? '')?.[1];
  return section ? RULE_TEXT[section] ?? null : null;
}
