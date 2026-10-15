// Competition mode: sends what the AI sees to the judges' phones while someone performs.
// No React here. The organizer's page creates one LivePublisher per performance and calls
// update() whenever the judging session changes; at most one write goes out every 500 ms
// (Firestore's free plan allows 20,000 writes a day; a 90 s routine needs about 180).

import type { DbStatus } from '../scoring';
import type { StoredEvent } from '../types';
import { describeMove } from '../ui/plain';
import type { LiveMove, LiveState } from './types';

export const PUBLISH_EVERY_MS = 500;

/** The part of the session's live box the judges see. */
export interface LiveBox {
  pose: string;
  showDots: boolean; // true while a balance is being held (false: "Watching…")
  text: string;
}

/** The AI's suggestions for one participant, from the session's judged moves and live box. */
export function buildLiveState(
  pid: string,
  events: StoredEvent[],
  status: Map<number, DbStatus>,
  live: LiveBox | null,
  startedAt: number | null,
  now: number,
): LiveState {
  const moves: LiveMove[] = events
    .filter((e) => !e.rejected)
    .map((e) => {
      const d = describeMove(e, status.get(e.id));
      return {
        id: e.id,
        name: d.name,
        dbValue: e.dbValid ? e.dbValue : 0,
        counts: status.get(e.id) === 'counted',
        deductions: d.reasons.map((r) => ({ text: r.text, value: r.value })),
        note: d.notes[0] ?? null,
      };
    });
  return {
    pid,
    moves,
    now: live && live.showDots ? { pose: live.pose, text: live.text } : null,
    startedAt,
    updatedAt: now,
  };
}

/**
 * Sends the newest LiveState, but not more often than every PUBLISH_EVERY_MS, and only when it
 * changed. The last change is always sent (trailing write), so the judges never miss the final move.
 */
export class LivePublisher {
  private lastKey = '';
  private lastSent = -Infinity;
  private pending: LiveState | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private send: (live: LiveState) => void,
    private clock: () => number = () => Date.now(),
    private schedule: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> = (fn, ms) => setTimeout(fn, ms),
    private cancel: (t: ReturnType<typeof setTimeout>) => void = (t) => clearTimeout(t),
  ) {}

  update(live: LiveState): void {
    const key = JSON.stringify({ moves: live.moves, now: live.now });
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.pending = live;
    const wait = this.lastSent + PUBLISH_EVERY_MS - this.clock();
    if (wait <= 0) this.flush();
    else this.timer ??= this.schedule(() => this.flush(), wait);
  }

  /** Send what is waiting right now (e.g. when the performance ends). */
  flush(): void {
    if (this.timer !== null) {
      this.cancel(this.timer);
      this.timer = null;
    }
    if (!this.pending) return;
    this.lastSent = this.clock();
    this.send(this.pending);
    this.pending = null;
  }

  /** Stop: nothing waiting is sent. */
  stop(): void {
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    this.pending = null;
  }
}
