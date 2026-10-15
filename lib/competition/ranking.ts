// Competition mode: the leaderboard order (no React, no Firebase). Only the totals: who gave
// which score, and where points were lost, stays with the organizer.

import type { Participant } from './types';

export interface RankedParticipant {
  rank: number;
  id: string;
  name: string;
  order: number;
  final: number;
}

export interface Leaderboard {
  /** Participants with a result, best first. Equal totals share a place (1, 1, 3). */
  ranked: RankedParticipant[];
  /** On the floor or being scored right now. */
  now: Participant | null;
  /** Still to perform, in starting order. */
  waiting: Participant[];
}

export function leaderboard(participants: Participant[]): Leaderboard {
  const done = participants
    .filter((p) => p.status === 'done' && p.result)
    .map((p) => ({ id: p.id, name: p.name, order: p.order, final: p.result!.final }))
    .sort((a, b) => b.final - a.final || a.order - b.order);
  const ranked: RankedParticipant[] = [];
  done.forEach((p, i) => {
    const tied = i > 0 && Math.round(p.final * 1000) === Math.round(done[i - 1].final * 1000);
    ranked.push({ ...p, rank: tied ? ranked[i - 1].rank : i + 1 });
  });
  return {
    ranked,
    now: participants.find((p) => p.status === 'performing' || p.status === 'scoring') ?? null,
    waiting: participants.filter((p) => p.status === 'waiting').sort((a, b) => a.order - b.order),
  };
}
