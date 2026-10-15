// Competition mode: how the human judges' scores become one result (no React, no Firebase).
//
// Each judge has one role, like the panels at an FIG rhythmic gymnastics competition:
//   D  Difficulty: the sum of the difficulties the judge counts
//   A  Artistry:   10 minus the judge's artistic deductions
//   E  Execution:  10 minus the judge's technical deductions
// Final = D + A + E - penalties (General #5.2, p. 12; same formula as lib/scoring.ts).
// The AI only suggests; its numbers never go into the result.
//
// Several judges in one role: with 4 or more, the highest and the lowest score are dropped and
// the rest averaged (as FIG does for its 4-judge A and E panels); with fewer, a plain average.
// This is a TEAM rule for small panels: the repo has no CoP text on panel sizes (docs/competition.md).

import { A_MAX, E_MAX } from '../rules';

export type Role = 'D' | 'A' | 'E';
export const ROLES: Role[] = ['D', 'A', 'E'];

export const ROLE_NAMES: Record<Role, string> = {
  D: 'Difficulty',
  A: 'Artistry',
  E: 'Execution',
};

/** The organizer can start once this many judges have joined (at least one per role). */
export const MIN_JUDGES = 3;

/** Panels this big or bigger drop their highest and lowest score. */
export const TRIM_FROM = 4;

/** RG results are shown with 3 decimals (e.g. 26.850). */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export interface PanelScore {
  /** The panel's score, or null when nobody in this role sent a score. */
  score: number | null;
  /** Indexes (into the values given) of the scores left out: highest and lowest. */
  dropped: number[];
}

/** One role's score from its judges' scores. */
export function panelScore(values: number[]): PanelScore {
  if (values.length === 0) return { score: null, dropped: [] };
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const dropped = values.length >= TRIM_FROM ? [order[0].i, order[order.length - 1].i] : [];
  const kept = values.filter((_, i) => !dropped.includes(i));
  const average = kept.reduce((sum, v) => sum + v, 0) / kept.length;
  return { score: round3(average), dropped };
}

export interface CompetitionResult {
  D: number;
  A: number;
  E: number;
  penalties: number;
  final: number;
}

/**
 * The participant's result from the scores the judges sent, grouped by role.
 * null while a role has no score yet.
 */
export function combineScores(scores: Record<Role, number[]>, penalties = 0): CompetitionResult | null {
  const D = panelScore(scores.D).score;
  const A = panelScore(scores.A).score;
  const E = panelScore(scores.E).score;
  if (D === null || A === null || E === null) return null;
  const a = clamp(A, 0, A_MAX);
  const e = clamp(E, 0, E_MAX);
  const p = Math.max(0, penalties);
  return { D: Math.max(0, D), A: a, E: e, penalties: round3(p), final: round3(Math.max(0, D + a + e - p)) };
}

/** Role for the next judge who joins: the role with the fewest judges (D, then A, then E on a tie). */
export function roleForNewJudge(existing: Role[]): Role {
  const count = (r: Role) => existing.filter((x) => x === r).length;
  return ROLES.reduce((best, r) => (count(r) < count(best) ? r : best));
}

export interface StartCheck {
  ok: boolean;
  /** Plain sentence for the organizer when the competition can't start yet. */
  reason: string | null;
}

/** Can the competition start? At least MIN_JUDGES judges, one in every role, and one participant. */
export function canStart(roles: Role[], participants: number): StartCheck {
  if (roles.length < MIN_JUDGES) {
    const missing = MIN_JUDGES - roles.length;
    return { ok: false, reason: `Waiting for ${missing} more judge${missing === 1 ? '' : 's'}.` };
  }
  const empty = ROLES.filter((r) => !roles.includes(r));
  if (empty.length) {
    return { ok: false, reason: `Give someone the ${empty.map((r) => ROLE_NAMES[r]).join(' and ')} role.` };
  }
  if (participants < 1) return { ok: false, reason: 'Add at least one participant.' };
  return { ok: true, reason: null };
}

/** Name a participant gets until the organizer types a real one. */
export function defaultParticipantName(order: number): string {
  return `Participant ${order}`;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
