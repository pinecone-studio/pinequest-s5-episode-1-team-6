// The pose library the app uses = the default examples shipped with the app
// (library/defaultLibrary.json for gymnastics, ballet/defaultLibrary.json for ballet) + the examples
// your team taught on this computer. Taught examples stay in this browser (localStorage), one list
// per sport. Export/Import moves them between computers so the whole team can share one library.
// Nothing is uploaded.

import { PoseLibrary, LIBRARY_VERSION, GYMNASTICS_SPEC, type Example, type LibraryJSON, type LibrarySpec, type PoseLabel } from '../library/recognizer';
import defaultLibraryData from '../library/defaultLibrary.json';

/** One sport's library: its defaults and its taught examples. */
export interface LibraryStore<L extends string> {
  spec: LibrarySpec<L>;
  /** The full library (default + taught), as a new PoseLibrary. */
  currentLibrary(): PoseLibrary<L>;
  /** Adds taught examples of one pose. Returns false if they could not be saved in the browser. */
  teach(label: L, signatures: number[][], source?: string): boolean;
  /** Number of examples per pose. */
  libraryCounts(): { default: Record<L, number>; taught: Record<L, number> };
  /** Taught examples as a JSON string, to share with the team. */
  exportTaught(): string;
  /**
   * Adds the examples from an exported file. Examples already in the library (same pose, same
   * numbers) are skipped, so loading the same file twice adds nothing.
   */
  importTaught(text: string): { added: number; skipped: number };
  /** Removes every taught example (the default library stays). */
  resetTaught(): void;
}

export function createLibraryStore<L extends string>(
  storageKey: string,
  spec: LibrarySpec<L>,
  defaults: LibraryJSON,
): LibraryStore<L> {
  const defaultExamples = PoseLibrary.fromJSON(defaults, spec).examples;
  let taught: Example<L>[] | null = null; // loaded on first use (localStorage only exists in the browser)
  const library = (examples: Example<L>[]) => new PoseLibrary<L>(examples, spec);

  const taughtExamples = (): Example<L>[] => {
    taught ??= load();
    return taught;
  };

  function load(): Example<L>[] {
    try {
      const data = JSON.parse(globalThis.localStorage?.getItem(storageKey) ?? 'null');
      return data ? PoseLibrary.fromJSON(data, spec).examples : [];
    } catch {
      return []; // storage blocked or corrupted: start without taught examples
    }
  }

  function save(): boolean {
    try {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify(library(taughtExamples()).toJSON()));
      return true;
    } catch {
      return false; // storage full or blocked: examples still work until the page is closed
    }
  }

  return {
    spec,
    currentLibrary: () => library([...defaultExamples, ...taughtExamples()]),
    teach(label, signatures, source = 'taught') {
      const lib = library(taughtExamples());
      for (const f of signatures) lib.add(label, f, source);
      taught = lib.examples;
      return save();
    },
    libraryCounts: () => ({ default: library(defaultExamples).counts(), taught: library(taughtExamples()).counts() }),
    exportTaught: () => JSON.stringify(library(taughtExamples()).toJSON()),
    importTaught(text) {
      const data = JSON.parse(text) as LibraryJSON;
      if (data.version !== LIBRARY_VERSION || data.features?.join() !== spec.features.map((f) => f.name).join()) {
        throw new Error('This file was made by a different version of the app, or for another sport');
      }
      const incoming = PoseLibrary.fromJSON(data, spec).examples;
      const seen = new Set(taughtExamples().map(exampleKey));
      const added = incoming.filter((e) => {
        const key = exampleKey(e);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      taught = [...taughtExamples(), ...added];
      save();
      return { added: added.length, skipped: incoming.length - added.length };
    },
    resetTaught() {
      taught = [];
      save();
    },
  };
}

/** Same pose and same numbers. Rounded like saved files, so a fresh example matches its saved copy. */
function exampleKey(e: { label: string; f: number[] }): string {
  return `${e.label}:${e.f.map((x) => Math.round(x * 1000) / 1000).join(',')}`;
}

/** Rhythmic gymnastics balances (the storage key predates the other sports: keep it). */
export const gymnasticsLibrary = createLibraryStore<PoseLabel>(
  'rhymnast.taughtPoses.v1', GYMNASTICS_SPEC, defaultLibraryData as LibraryJSON,
);

// The gymnastics store's functions by name, as the app and the tests have always used them.
export const { currentLibrary, teach, libraryCounts, exportTaught, importTaught, resetTaught } = gymnasticsLibrary;
