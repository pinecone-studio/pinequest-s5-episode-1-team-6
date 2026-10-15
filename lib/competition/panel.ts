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
//
// A competition can run with any number of judges, even one (user, 2026-10-15). A role nobody judges
// is left out of the total: with only a D judge, Final = D - penalties. Every participant of one
// competition has the same panel, so the ranking stays fair.

import { A_MAX, E_MAX } from '../rules';

export type Role = 'D' | 'A' | 'E';
export const ROLES: Role[] = ['D', 'A', 'E'];

export const ROLE_NAMES: Record<Role, string> = {
  D: 'Difficulty',
  A: 'Artistry',
  E: 'Execution',
};

/** The organizer can start once this many judges have joined (any roles). */
export const MIN_JUDGES = 1;

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
  /** A role's panel score, or null when the role had no judge (left out of the final). */
  D: number | null;
  A: number | null;
  E: number | null;
  penalties: number;
  final: number;
}

/**
 * The participant's result from the scores the judges sent, grouped by role.
 * `panel` lists the roles that have a judge: each of them needs a score before there is a result
 * (null until then). A role outside the panel with no score is left out of the final.
 */
export function combineScores(scores: Record<Role, number[]>, penalties = 0, panel: Role[] = ROLES): CompetitionResult | null {
  const part = (r: Role) => panelScore(scores[r]).score;
  const D = part('D');
  const A = part('A');
  const E = part('E');
  const byRole = { D, A, E };
  if (panel.some((r) => byRole[r] === null)) return null;
  if (D === null && A === null && E === null) return null;
  const d = D === null ? null : Math.max(0, D);
  const a = A === null ? null : clamp(A, 0, A_MAX);
  const e = E === null ? null : clamp(E, 0, E_MAX);
  const p = Math.max(0, penalties);
  const sum = (d ?? 0) + (a ?? 0) + (e ?? 0);
  return { D: d, A: a, E: e, penalties: round3(p), final: round3(Math.max(0, sum - p)) };
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

/** Can the competition start? At least MIN_JUDGES judge (any role) and one participant. */
export function canStart(roles: Role[], participants: number): StartCheck {
  if (roles.length < MIN_JUDGES) return { ok: false, reason: 'Waiting for a judge to join.' };
  if (participants < 1) return { ok: false, reason: 'Add at least one participant.' };
  return { ok: true, reason: null };
}

/** Roles nobody judges: they are left out of every total. */
export function rolesWithoutJudge(roles: Role[]): Role[] {
  return ROLES.filter((r) => !roles.includes(r));
}

/** Name a participant gets until the organizer types a real one. */
export function defaultParticipantName(order: number): string {
  return `Participant ${order}`;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
