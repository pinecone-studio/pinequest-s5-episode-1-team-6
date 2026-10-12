// Scoring engine. Turns judged element events + human judge inputs into a final score.
//
//   Final = D + A + E - penalties                         (CoP General #5.2, p. 12)
//   D  = highest 8 valid body difficulties (DB)            (#1.5, p. 21)
//        a repeated difficulty (same code) is not counted again (#2.4.1, #8.9)
//   E  = 10 - automated technical faults - judge's extra E deductions
//   A  = Artistry, entered by human judges (0-10)
//
// Only what the app can measure is automated. Apparatus difficulty (DA), dance steps,
// R elements, and most apparatus faults are NOT detected, which is why judges can add
// D points and E deductions by hand.
// A judge can reject any automated event; rejected events count for nothing.

import { A_MAX, E_MAX, MAX_DB_COUNTED, round2 } from './rules';
import type { ElementEvent, StoredEvent } from './types';

/** Numbers entered by the judges. Strings are accepted (straight from form inputs). */
export interface JudgeInputs {
  artistry?: number | string;
  extraD?: number | string;
  extraE?: number | string;
  penalties?: number | string;
}

export type DbStatus = 'counted' | 'repeat' | 'not valid' | 'not in top 8' | 'rejected';

export interface ScoreResult {
  D: number;
  A: number;
  E: number;
  final: number;
  breakdown: {
    autoD: number;
    extraD: number;
    autoE: number;
    extraE: number;
    penalties: number;
  };
  status: Map<number, DbStatus>;
}

export class Scoreboard {
  events: StoredEvent[] = [];
  private nextId = 1;

  reset(): void {
    this.events = [];
    this.nextId = 1;
  }

  /** Adds an element event (from a detector). Returns it with an id. */
  add(event: ElementEvent): StoredEvent {
    const stored = { ...event, id: this.nextId++, rejected: false };
    this.events.push(stored);
    return stored;
  }

  /** Judge accepts or rejects an automated event. */
  setRejected(id: number, rejected: boolean): void {
    const ev = this.events.find((e) => e.id === id);
    if (ev) ev.rejected = rejected;
  }

  /**
   * @param judge numbers entered by judges
   * @returns scores plus, per event, whether its DB counted and why
   */
  compute(judge: JudgeInputs = {}): ScoreResult {
    const artistry = clamp(num(judge.artistry), 0, A_MAX);
    const extraD = Math.max(0, num(judge.extraD));
    const extraE = Math.max(0, num(judge.extraE));
    const penalties = Math.max(0, num(judge.penalties));

    const accepted = [...this.events]
      .filter((e) => !e.rejected)
      .sort((a, b) => a.t - b.t);

    // Repetition: the first valid difficulty from a box (table row) counts, later ones don't.
    // Events without a box (e.g. leaps) use their code.
    const seenBoxes = new Set<string>();
    const status = new Map<number, DbStatus>();
    const candidates: StoredEvent[] = [];
    for (const e of accepted) {
      const box = e.box ?? e.code;
      if (!e.dbValid || e.dbValue <= 0) {
        status.set(e.id, 'not valid');
      } else if (seenBoxes.has(box)) {
        status.set(e.id, 'repeat');
      } else {
        seenBoxes.add(box);
        candidates.push(e);
      }
    }
    // Highest 8 count.
    const top = [...candidates].sort((a, b) => b.dbValue - a.dbValue).slice(0, MAX_DB_COUNTED);
    const topIds = new Set(top.map((e) => e.id));
    for (const e of candidates) status.set(e.id, topIds.has(e.id) ? 'counted' : 'not in top 8');
    for (const e of this.events) if (e.rejected) status.set(e.id, 'rejected');

    const autoD = sum(top.map((e) => e.dbValue));
    // Execution faults are penalized every time, including on repeats (#1.6 Execution).
    const autoE = sum(accepted.flatMap((e) => e.penalties.map((p) => p.value)));

    const D = round2(autoD + extraD);
    const E = round2(Math.max(0, E_MAX - autoE - extraE));
    const A = round2(artistry);
    const final = round2(Math.max(0, D + A + E - penalties));

    return {
      D, A, E, final,
      breakdown: {
        autoD: round2(autoD), extraD: round2(extraD),
        autoE: round2(autoE), extraE: round2(extraE),
        penalties: round2(penalties),
      },
      status,
    };
  }

  /** Full audit record for export. */
  toAudit(judge: JudgeInputs, meta: Record<string, unknown> = {}) {
    const result = this.compute(judge);
    return {
      ...meta,
      exportedAt: new Date().toISOString(),
      judgeInputs: judge,
      scores: { D: result.D, A: result.A, E: result.E, final: result.final, ...result.breakdown },
      events: this.events.map((e) => ({ ...e, dbStatus: result.status.get(e.id) })),
    };
  }
}

function num(x: unknown): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function sum(values: number[]): number {
  // Sum in hundredths to avoid floating point drift (0.1 + 0.2 !== 0.3).
  return values.reduce((acc, v) => acc + Math.round(v * 100), 0) / 100;
}
