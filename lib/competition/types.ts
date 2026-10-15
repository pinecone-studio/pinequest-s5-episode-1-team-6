// Competition mode data, as the app sees it (no Firebase here: lib/firebase/competition.ts maps the
// Firestore documents to these shapes). Layout of the documents: see firestore.rules.

import type { CompetitionResult, Role } from './panel';

/** lobby: judges join, participants are set up. running: participants perform. finished: final ranking. */
export type CompetitionStatus = 'lobby' | 'running' | 'finished';

/** What happens right now while the competition runs. */
export type Phase = 'idle' | 'performing' | 'scoring';

/** The participant on the floor (copied into the competition so judges can read the name). */
export interface CurrentParticipant {
  pid: string;
  name: string;
  order: number;
}

export interface Competition {
  id: string;
  ownerUid: string;
  name: string;
  status: CompetitionStatus;
  phase: Phase;
  current: CurrentParticipant | null;
  createdAt: number; // ms
}

export interface Judge {
  uid: string;
  name: string;
  /** null until the organizer's page gives the judge a role (it does so right away). */
  role: Role | null;
  joinedAt: number; // ms
}

export type ParticipantStatus = 'waiting' | 'performing' | 'scoring' | 'done';

export interface Participant {
  id: string;
  order: number;
  name: string;
  status: ParticipantStatus;
  /** Entered by the organizer (the coordinator's job), deducted from the final. */
  penalties: number;
  result: CompetitionResult | null;
}

/** One line on a judge's score sheet: a difficulty counted (D) or a deduction (A, E). */
export interface ScoreItem {
  label: string;
  value: number;
  /** Added with one tap from the AI's suggestion. */
  fromAi: boolean;
}

/** What one judge sent for one participant. */
export interface JudgeScore {
  judgeUid: string;
  role: Role;
  /** D: sum of the difficulties. A, E: 10 minus the deductions. */
  value: number;
  items: ScoreItem[];
  submittedAt: number; // ms
}

/** One move the AI judged, as a suggestion for the judges. */
export interface LiveMove {
  id: number;
  name: string;
  /** Difficulty value (0 when the shape was too far off to count). */
  dbValue: number;
  /** Does it count as a difficulty (not a repeat, valid, within the highest 8)? */
  counts: boolean;
  deductions: { text: string; value: number }[];
  /** One plain sentence when something is worth a look ("Not counted again: …"), else null. */
  note: string | null;
}

/** What the AI sees right now, sent to the judges' phones while someone performs. */
export interface LiveState {
  pid: string;
  moves: LiveMove[];
  /** The live box: pose being held and one plain sentence; null when nothing is held. */
  now: { pose: string; text: string } | null;
  /** When the performance started (ms since epoch), for the timer on the judges' phones. */
  startedAt: number | null;
  updatedAt: number; // ms
}
