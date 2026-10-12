// The pose library the app uses = the default examples shipped with the app
// (library/defaultLibrary.json) + the examples your team taught on this computer.
// Taught examples stay in this browser (localStorage). Export/Import moves them between
// computers so the whole team can share one library. Nothing is uploaded.

import { PoseLibrary, LIBRARY_VERSION, type Example, type LibraryJSON, type PoseLabel } from '../library/recognizer';
import { FEATURES } from '../library/signature';
import defaultLibraryData from '../library/defaultLibrary.json';

const STORAGE_KEY = 'rhymnast.taughtPoses.v1';
const defaultExamples = PoseLibrary.fromJSON(defaultLibraryData as LibraryJSON).examples;
let taught: Example[] | null = null; // loaded on first use (localStorage only exists in the browser)

function taughtExamples(): Example[] {
  taught ??= load();
  return taught;
}

function load(): Example[] {
  try {
    const data = JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) ?? 'null');
    return data ? PoseLibrary.fromJSON(data).examples : [];
  } catch {
    return []; // storage blocked or corrupted: start without taught examples
  }
}

function save(): boolean {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(new PoseLibrary(taughtExamples()).toJSON()));
    return true;
  } catch {
    return false; // storage full or blocked: examples still work until the page is closed
  }
}

/** The full library (default + taught), as a new PoseLibrary. */
export function currentLibrary(): PoseLibrary {
  return new PoseLibrary([...defaultExamples, ...taughtExamples()]);
}

/** Adds taught examples of one pose. Returns false if they could not be saved in the browser. */
export function teach(label: PoseLabel, signatures: number[][], source = 'taught'): boolean {
  const lib = new PoseLibrary(taughtExamples());
  for (const f of signatures) lib.add(label, f, source);
  taught = lib.examples;
  return save();
}

/** Number of examples per pose. */
export function libraryCounts(): { default: Record<PoseLabel, number>; taught: Record<PoseLabel, number> } {
  return { default: new PoseLibrary(defaultExamples).counts(), taught: new PoseLibrary(taughtExamples()).counts() };
}

/** Taught examples as a JSON string, to share with the team. */
export function exportTaught(): string {
  return JSON.stringify(new PoseLibrary(taughtExamples()).toJSON());
}

/** Adds the examples from an exported file. Returns how many were added. */
export function importTaught(text: string): number {
  const data = JSON.parse(text) as LibraryJSON;
  if (data.version !== LIBRARY_VERSION || data.features?.join() !== FEATURES.map((f) => f.name).join()) {
    throw new Error('This file was made by a different version of the app');
  }
  const incoming = PoseLibrary.fromJSON(data).examples;
  taught = [...taughtExamples(), ...incoming];
  save();
  return incoming.length;
}

/** Removes every taught example (the default library stays). */
export function resetTaught(): void {
  taught = [];
  save();
}
