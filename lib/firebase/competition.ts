// Competition mode on Firestore. No React here: components/competition/ calls these.
// Who may read or write what is enforced by firestore.rules; the shapes are in lib/competition/types.ts.
//
// Every watch*() function calls back now and after every change (Firestore onSnapshot) and
// returns a function that stops watching.

import {
  collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type DocumentData, type DocumentSnapshot, type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getClientAuth, getClientDb } from './client';
import { newJoinKey, participantChanges } from '../competition/links';
import type { CompetitionResult, Role } from '../competition/panel';
import type {
  Competition, CurrentParticipant, Judge, JudgeScore, LiveState, Participant, ScoreItem,
} from '../competition/types';

type Unsubscribe = () => void;
type OnError = (error: Error) => void;

// ---------- Paths ----------

const competitionRef = (cid: string) => doc(getClientDb(), 'competitions', cid);
const joinRef = (cid: string) => doc(getClientDb(), 'competitions', cid, 'private', 'join');
const judgesRef = (cid: string) => collection(getClientDb(), 'competitions', cid, 'judges');
const participantsRef = (cid: string) => collection(getClientDb(), 'competitions', cid, 'participants');
const scoresRef = (cid: string, pid: string) => collection(getClientDb(), 'competitions', cid, 'participants', pid, 'scores');
const liveRef = (cid: string) => doc(getClientDb(), 'competitions', cid, 'live', 'current');

function myUid(): string {
  const uid = getClientAuth().currentUser?.uid;
  if (!uid) throw new Error('Sign in first');
  return uid;
}

/** Firestore timestamp (or one still being written) to ms. */
function millis(value: unknown): number {
  const ts = value as { toMillis?: () => number } | null | undefined;
  return ts?.toMillis ? ts.toMillis() : Date.now();
}

// ---------- Documents to app shapes ----------

function toCompetition(snap: DocumentSnapshot<DocumentData>): Competition | null {
  const d = snap.data({ serverTimestamps: 'estimate' });
  if (!d) return null;
  return {
    id: snap.id,
    ownerUid: d.ownerUid,
    name: d.name ?? '',
    status: d.status ?? 'lobby',
    phase: d.phase ?? 'idle',
    current: d.current ?? null,
    createdAt: millis(d.createdAt),
  };
}

function toJudge(snap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Judge | null {
  const d = snap.data({ serverTimestamps: 'estimate' });
  if (!d) return null;
  return { uid: snap.id, name: d.name ?? '', role: d.role ?? null, joinedAt: millis(d.joinedAt) };
}

function toParticipant(snap: QueryDocumentSnapshot<DocumentData>): Participant {
  const d = snap.data();
  return {
    id: snap.id,
    order: d.order,
    name: d.name ?? '',
    status: d.status ?? 'waiting',
    penalties: d.penalties ?? 0,
    result: d.result ?? null,
  };
}

function toScore(snap: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): JudgeScore | null {
  const d = snap.data({ serverTimestamps: 'estimate' });
  if (!d) return null;
  return { judgeUid: snap.id, role: d.role, value: d.value, items: d.items ?? [], submittedAt: millis(d.submittedAt) };
}

// ---------- Organizer: the competition ----------

/** New competition owned by the signed-in person, with a fresh join key. Returns its id. */
export async function createCompetition(name: string): Promise<string> {
  const ownerUid = myUid();
  const ref = doc(collection(getClientDb(), 'competitions'));
  await setDoc(ref, {
    ownerUid,
    name: name.trim() || 'Competition',
    status: 'lobby',
    phase: 'idle',
    current: null,
    createdAt: serverTimestamp(),
  });
  // Separate write: the rules check that the competition (and its owner) already exists.
  await setDoc(joinRef(ref.id), { key: newJoinKey() });
  return ref.id;
}

/** The signed-in person's competitions, newest first. */
export function watchMyCompetitions(onChange: (list: Competition[]) => void, onError: OnError): Unsubscribe {
  // Sorted here, not in the query: a where + orderBy on two fields would need a Firestore index.
  const q = query(collection(getClientDb(), 'competitions'), where('ownerUid', '==', myUid()));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(toCompetition).filter((c): c is Competition => c !== null);
    onChange(list.sort((a, b) => b.createdAt - a.createdAt));
  }, onError);
}

/** One competition (organizer, or a judge who joined). null if it doesn't exist. */
export function watchCompetition(cid: string, onChange: (c: Competition | null) => void, onError: OnError): Unsubscribe {
  return onSnapshot(competitionRef(cid), (snap) => onChange(toCompetition(snap)), onError);
}

/** The key in the judges' QR code (organizer only). */
export async function getJoinKey(cid: string): Promise<string> {
  const snap = await getDoc(joinRef(cid));
  const key = snap.data()?.key;
  if (typeof key !== 'string') throw new Error('This competition has no join key');
  return key;
}

export async function renameCompetition(cid: string, name: string): Promise<void> {
  await updateDoc(competitionRef(cid), { name: name.trim() || 'Competition' });
}

export async function startCompetition(cid: string): Promise<void> {
  await updateDoc(competitionRef(cid), { status: 'running', phase: 'idle', current: null });
}

export async function finishCompetition(cid: string): Promise<void> {
  await updateDoc(competitionRef(cid), { status: 'finished', phase: 'idle', current: null });
}

// ---------- Judges ----------

/**
 * Join as a judge with the key from the QR code. Joining again only updates the name.
 * Fails (permission denied) when the key is wrong.
 */
export async function joinCompetition(cid: string, key: string, name: string): Promise<void> {
  const uid = myUid();
  const ref = doc(judgesRef(cid), uid);
  const cleanName = name.trim().slice(0, 60) || 'Judge';
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { name: cleanName });
    return;
  }
  await setDoc(ref, { name: cleanName, joinKey: key, joinedAt: serverTimestamp(), role: null });
}

/** The signed-in judge's own entry (null before joining): name and role. */
export function watchMyJudge(cid: string, onChange: (judge: Judge | null) => void, onError: OnError): Unsubscribe {
  return onSnapshot(doc(judgesRef(cid), myUid()), (snap) => onChange(toJudge(snap)), onError);
}

/** Every judge who joined, in joining order (organizer only). */
export function watchJudges(cid: string, onChange: (judges: Judge[]) => void, onError: OnError): Unsubscribe {
  return onSnapshot(judgesRef(cid), (snap) => {
    const judges = snap.docs.map(toJudge).filter((j): j is Judge => j !== null);
    onChange(judges.sort((a, b) => a.joinedAt - b.joinedAt));
  }, onError);
}

export async function setJudgeRole(cid: string, uid: string, role: Role): Promise<void> {
  await updateDoc(doc(judgesRef(cid), uid), { role });
}

export async function removeJudge(cid: string, uid: string): Promise<void> {
  await deleteDoc(doc(judgesRef(cid), uid));
}

// ---------- Participants (organizer) ----------

/** Participants in starting order. */
export function watchParticipants(cid: string, onChange: (list: Participant[]) => void, onError: OnError): Unsubscribe {
  return onSnapshot(participantsRef(cid), (snap) => {
    onChange(snap.docs.map(toParticipant).sort((a, b) => a.order - b.order));
  }, onError);
}

/** Grow or shrink the list to `count` (new ones get "Participant N"; those who performed stay). */
export async function setParticipantCount(cid: string, existing: Participant[], count: number): Promise<void> {
  const { add, remove } = participantChanges(existing, count);
  if (!add.length && !remove.length) return;
  const batch = writeBatch(getClientDb());
  for (const p of add) {
    batch.set(doc(participantsRef(cid), p.id), { order: p.order, name: p.name, status: 'waiting', penalties: 0, result: null });
  }
  for (const id of remove) batch.delete(doc(participantsRef(cid), id));
  await batch.commit();
}

export async function renameParticipant(cid: string, pid: string, name: string): Promise<void> {
  await updateDoc(doc(participantsRef(cid), pid), { name: name.trim().slice(0, 60) });
}

export async function setPenalties(cid: string, pid: string, penalties: number): Promise<void> {
  await updateDoc(doc(participantsRef(cid), pid), { penalties: Math.max(0, penalties) });
}

// ---------- One participant's turn (organizer) ----------

/** The participant steps onto the floor: judges see the name, the AI starts, old suggestions are cleared. */
export async function startParticipant(cid: string, p: Pick<Participant, 'id' | 'name' | 'order'>): Promise<void> {
  const current: CurrentParticipant = { pid: p.id, name: p.name, order: p.order };
  const live: LiveState = { pid: p.id, moves: [], now: null, startedAt: Date.now(), updatedAt: Date.now() };
  const batch = writeBatch(getClientDb());
  batch.update(competitionRef(cid), { phase: 'performing', current });
  batch.update(doc(participantsRef(cid), p.id), { status: 'performing' });
  batch.set(liveRef(cid), live);
  await batch.commit();
}

/** The performance is over: judges can send their scores now. */
export async function endPerformance(cid: string, pid: string): Promise<void> {
  const batch = writeBatch(getClientDb());
  batch.update(competitionRef(cid), { phase: 'scoring' });
  batch.update(doc(participantsRef(cid), pid), { status: 'scoring' });
  await batch.commit();
}

/** Save the combined result and free the floor for the next participant. */
export async function finalizeParticipant(cid: string, pid: string, result: CompetitionResult): Promise<void> {
  const batch = writeBatch(getClientDb());
  batch.update(doc(participantsRef(cid), pid), { status: 'done', result, penalties: result.penalties });
  batch.update(competitionRef(cid), { phase: 'idle', current: null });
  await batch.commit();
}

// ---------- AI suggestions while someone performs ----------

/** Replace the live suggestions (organizer). Keep calls to about 2 per second: see livePublisher. */
export async function publishLive(cid: string, live: LiveState): Promise<void> {
  await setDoc(liveRef(cid), live);
}

/** The AI's suggestions (organizer and judges). null before the first participant. */
export function watchLive(cid: string, onChange: (live: LiveState | null) => void, onError: OnError): Unsubscribe {
  return onSnapshot(liveRef(cid), (snap) => onChange((snap.data() as LiveState | undefined) ?? null), onError);
}

// ---------- Scores ----------

/** Send the signed-in judge's score for the participant being scored. Can only be sent once. */
export async function submitScore(cid: string, pid: string, role: Role, value: number, items: ScoreItem[]): Promise<void> {
  const uid = myUid();
  await setDoc(doc(scoresRef(cid, pid), uid), { role, value, items, submittedAt: serverTimestamp() });
}

/** The signed-in judge's own score for one participant (null until sent). */
export function watchMyScore(cid: string, pid: string, onChange: (score: JudgeScore | null) => void, onError: OnError): Unsubscribe {
  return onSnapshot(doc(scoresRef(cid, pid), myUid()), (snap) => onChange(toScore(snap)), onError);
}

/** Every judge's score for one participant (organizer only). */
export function watchScores(cid: string, pid: string, onChange: (scores: JudgeScore[]) => void, onError: OnError): Unsubscribe {
  return onSnapshot(scoresRef(cid, pid), (snap) => {
    onChange(snap.docs.map(toScore).filter((s): s is JudgeScore => s !== null));
  }, onError);
}
