// Competition mode: the judges' join link (in the QR code), the join key, and participant
// numbering. Pure functions, tested in tests/competitionLinks.test.ts.

import { defaultParticipantName } from './panel';

export const JUDGE_PATH = '/judge';

/** The link in the QR code: opens the judge page of this competition, with its join key. */
export function judgeLink(origin: string, competitionId: string, key: string): string {
  const params = new URLSearchParams({ c: competitionId, k: key });
  return `${origin}${JUDGE_PATH}?${params.toString()}`;
}

/** A random join key (22 URL-safe characters, 128 bits). Hard to guess, so only people with the QR can join. */
export function newJoinKey(random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  const bytes = random(new Uint8Array(16));
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Participant document id for a starting order: p001, p002, … (sorts in order, never reused). */
export function participantId(order: number): string {
  return `p${String(order).padStart(3, '0')}`;
}

export interface ParticipantChanges {
  /** Orders to create, each with its default name. */
  add: { id: string; order: number; name: string }[];
  /** Ids to delete (from the end of the list). */
  remove: string[];
}

/**
 * What to change so the list has `count` participants. New ones are added at the end with default
 * names; extra ones are removed from the end, but only if they haven't performed yet.
 */
export function participantChanges(
  existing: { id: string; order: number; status: string }[],
  count: number,
): ParticipantChanges {
  const sorted = [...existing].sort((a, b) => a.order - b.order);
  const target = Math.max(0, Math.floor(count));
  const add: ParticipantChanges['add'] = [];
  const lastOrder = sorted.length ? sorted[sorted.length - 1].order : 0;
  for (let i = sorted.length; i < target; i++) {
    const order = lastOrder + (i - sorted.length) + 1;
    add.push({ id: participantId(order), order, name: defaultParticipantName(order) });
  }
  const remove: string[] = [];
  for (let i = sorted.length - 1; i >= target; i--) {
    if (sorted[i].status !== 'waiting') break; // never remove someone who has performed
    remove.push(sorted[i].id);
  }
  return { add, remove };
}
