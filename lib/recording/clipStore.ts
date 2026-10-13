// Saved move videos, in this browser's IndexedDB (localStorage is too small for video). Nothing is
// uploaded. The newest KEEP_ROUTINES routines are kept; older ones are deleted when a new one is saved.
// Every function resolves to an empty / false result where storage is blocked (some private windows).

const DB_NAME = 'rhymnast-videos';
const DB_VERSION = 1;
export const KEEP_ROUTINES = 10;

export interface SavedRoutine {
  id: string;
  createdAt: number; // ms since 1970
  pointsLost: number;
  videos: number;
}

export interface SavedMove {
  id: string;
  routineId: string;
  number: number; // move number in the routine (as in the report)
  name: string;
  result: string; // "0.40 points lost"
  tone: 'good' | 'warn' | 'bad'; // color of the result, as in the report
  reasons: string[];
  clip: Blob;
  clipType: string;
  photo: Blob;
}

/** Routines to delete so only the newest `keep` remain (pure, so it is unit tested). */
export function routinesToDelete(routines: SavedRoutine[], keep = KEEP_ROUTINES): SavedRoutine[] {
  return [...routines].sort((a, b) => b.createdAt - a.createdAt).slice(keep);
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore('routines', { keyPath: 'id' });
        db.createObjectStore('moves', { keyPath: 'id' }).createIndex('routineId', 'routineId');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null); // no IndexedDB here
    }
  });
  return dbPromise;
}

function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Saving was cancelled'));
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Saves one routine's videos, then deletes the oldest beyond KEEP_ROUTINES. True when saved. */
export async function saveRoutine(routine: SavedRoutine, moves: SavedMove[]): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  try {
    const tx = db.transaction(['routines', 'moves'], 'readwrite');
    tx.objectStore('routines').put(routine);
    for (const move of moves) tx.objectStore('moves').put(move);
    await finished(tx);
    for (const old of routinesToDelete(await listRoutines())) await deleteRoutine(old.id);
    return true;
  } catch (err) {
    console.warn('Could not save the move videos in this browser', err); // e.g. the disk is full
    return false;
  }
}

/** Saved routines, newest first. */
export async function listRoutines(): Promise<SavedRoutine[]> {
  const db = await openDb();
  if (!db) return [];
  const all = await result(db.transaction('routines').objectStore('routines').getAll() as IDBRequest<SavedRoutine[]>);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/** The videos of one routine, in move order. */
export async function movesOf(routineId: string): Promise<SavedMove[]> {
  const db = await openDb();
  if (!db) return [];
  const index = db.transaction('moves').objectStore('moves').index('routineId');
  const moves = await result(index.getAll(routineId) as IDBRequest<SavedMove[]>);
  return moves.sort((a, b) => a.number - b.number);
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(['routines', 'moves'], 'readwrite');
  tx.objectStore('routines').delete(routineId);
  const moves = tx.objectStore('moves');
  const keys = await result(moves.index('routineId').getAllKeys(routineId));
  for (const key of keys) moves.delete(key);
  await finished(tx);
}

export async function deleteAllRoutines(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(['routines', 'moves'], 'readwrite');
  tx.objectStore('routines').clear();
  tx.objectStore('moves').clear();
  await finished(tx);
}
