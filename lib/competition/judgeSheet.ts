// Competition mode: one judge's score sheet for one participant (no React, no Firebase).
//   D judge: adds the difficulties they count (D = the sum).
//   A / E judge: adds deductions (score = 10 - the deductions).
// Each line comes from a quick button (+0.30, -0.10, …) or, with one tap, from the AI's suggestion.
// The AI never decides: a suggestion only counts once the judge taps it.

import { A_MAX, E_MAX } from '../rules';
import type { Role } from './panel';
import type { LiveState } from './types';

export interface SheetItem {
  /** Unique on the sheet. AI suggestions use their suggestion key, so tapping again removes them. */
  id: string;
  label: string;
  value: number;
  fromAi: boolean;
}

/** Quick buttons per role. E uses the CoP's small / medium / large deductions (#2.5: 0.10 / 0.30 / 0.50). */
export const QUICK_VALUES: Record<Role, number[]> = {
  D: [0.1, 0.2, 0.3, 0.4, 0.5],
  A: [0.1, 0.2, 0.3, 0.5],
  E: [0.1, 0.3, 0.5],
};

/** D adds up; A and E are deducted from 10. */
export const ADDS: Record<Role, boolean> = { D: true, A: false, E: false };

/** The judge's score from their sheet, in hundredths (never below 0, A and E never above 10). */
export function sheetScore(role: Role, items: SheetItem[]): number {
  const total = items.reduce((sum, i) => sum + Math.round(i.value * 100), 0) / 100;
  if (ADDS[role]) return Math.round(total * 100) / 100;
  const max = role === 'A' ? A_MAX : E_MAX;
  return Math.max(0, Math.round((max - total) * 100) / 100);
}

/** Sum of the lines (difficulties for D, deductions for A and E). */
export function sheetTotal(items: SheetItem[]): number {
  return items.reduce((sum, i) => sum + Math.round(i.value * 100), 0) / 100;
}

export interface Suggestion {
  key: string;
  label: string;
  /** Extra plain sentence, e.g. what was wrong. */
  detail: string | null;
  value: number;
  /**
   * false: the AI judged the move, but it changes nothing on this sheet (not a difficulty that
   * counts, or no points lost). Shown so the judge sees the AI judged it; it can't be added.
   */
  addable: boolean;
}

/**
 * The AI's suggestions for this role, newest first. Every move the AI judged shows up once it is over.
 *   D: every move that counts as a difficulty, with its value; any other move as information.
 *   E: every deduction the AI measured; a move without one as information ("No points lost.").
 *   A: none (the AI does not judge artistry).
 */
export function suggestionsFor(role: Role, live: LiveState | null): Suggestion[] {
  if (!live || role === 'A') return [];
  const out: Suggestion[] = [];
  for (const m of live.moves) {
    if (role === 'D') {
      if (m.counts && m.dbValue > 0) out.push({ key: `ai-d-${m.id}`, label: m.name, detail: m.note, value: m.dbValue, addable: true });
      else out.push({ key: `ai-d-${m.id}-info`, label: m.name, detail: m.note ?? 'Not counted as a difficulty.', value: 0, addable: false });
    } else if (m.deductions.length === 0) {
      out.push({ key: `ai-e-${m.id}-ok`, label: m.name, detail: 'No points lost.', value: 0, addable: false });
    } else {
      m.deductions.forEach((d, i) => out.push({ key: `ai-e-${m.id}-${i}`, label: m.name, detail: d.text, value: d.value, addable: true }));
    }
  }
  return out.reverse();
}

/** Tap on a suggestion: add it, or take it back off if it is already on the sheet. */
export function toggleSuggestion(items: SheetItem[], s: Suggestion): SheetItem[] {
  if (!s.addable) return items;
  return items.some((i) => i.id === s.key)
    ? items.filter((i) => i.id !== s.key)
    : [...items, { id: s.key, label: s.label, value: s.value, fromAi: true }];
}

/** A quick button: one more line with this value (ids q1, q2, …: unique on the sheet). */
export function addQuick(items: SheetItem[], role: Role, value: number): SheetItem[] {
  const label = ADDS[role] ? 'Difficulty' : 'Deduction';
  const last = Math.max(0, ...items.map((i) => (/^q(\d+)$/.exec(i.id) ? Number(i.id.slice(1)) : 0)));
  return [...items, { id: `q${last + 1}`, label, value, fromAi: false }];
}

export function removeItem(items: SheetItem[], id: string): SheetItem[] {
  return items.filter((i) => i.id !== id);
}

/** Undo the last line. */
export function undo(items: SheetItem[]): SheetItem[] {
  return items.slice(0, -1);
}

/** "+0.30" for D, "−0.30" for A and E. */
export function signed(role: Role, value: number): string {
  return `${ADDS[role] ? '+' : '−'}${value.toFixed(2)}`;
}
