// Pose library: recognizes the balances by comparing a frame's pose signature with many
// labeled examples of the correct poses (and of poses that are NOT ours), nearest neighbours.
// Nothing is trained in the machine-learning sense: adding examples is the "learning".
//
// One library per sport. A LibrarySpec says which pose labels and which signature features it
// uses: the rhythmic gymnastics balances (the default, below) or the ballet poses (lib/ballet/library.ts).

import { FEATURES } from './signature';

export const LIBRARY_VERSION = 1;

// Pose labels. 'none' examples teach the library what to reject (standing, passé, ring…).
export const POSES = ['frontSplitHelp', 'frontSplit', 'backSplitFootAboveHead', 'backSplitTrunkForward', 'arabesque', 'attitude', 'none'] as const;
export type PoseLabel = (typeof POSES)[number];

export const POSE_NAMES: Record<PoseLabel, string> = {
  frontSplitHelp: 'Front split with help',
  frontSplit: 'Front split without help',
  backSplitFootAboveHead: 'Back split, foot above head',
  backSplitTrunkForward: 'Back split, trunk forward',
  arabesque: 'Arabesque',
  attitude: 'Attitude',
  none: 'Not one of these',
};

/** What a pose library holds: its labels (always with 'none') and its signature's features. */
export interface LibrarySpec<L extends string = string> {
  labels: readonly L[];
  features: readonly { name: string; weight: number }[];
}

/** The rhythmic gymnastics balances. */
export const GYMNASTICS_SPEC: LibrarySpec<PoseLabel> = { labels: POSES, features: FEATURES };

export const RECOGNIZER_SETTINGS = {
  k: 7, // neighbours that vote
  maxDistance: 0.35, // nearest example farther than this: unknown pose
  minConfidence: 0.6, // share of the vote the winner needs
  minExamplesPerPose: 5, // below this the library doesn't vote for that pose
};
export type RecognizerSettings = typeof RECOGNIZER_SETTINGS;

export interface Example<L extends string = PoseLabel> {
  label: L;
  f: number[];
  source: string;
}

/** A pose library as saved in a JSON file. */
export interface LibraryJSON {
  version: number;
  features?: string[];
  examples: { label: string; f: number[]; source?: string }[];
}

export interface Recognition<L extends string = PoseLabel> {
  pose: L | null;
  confidence: number;
  distance: number;
  winner?: string;
}

export class PoseLibrary<L extends string = PoseLabel> {
  examples: Example<L>[] = [];
  readonly spec: LibrarySpec<L>;
  private weights: number[];

  constructor(
    examples: { label: string; f: number[]; source?: string }[] = [],
    spec: LibrarySpec<L> = GYMNASTICS_SPEC as unknown as LibrarySpec<L>,
  ) {
    this.spec = spec;
    this.weights = spec.features.map((f) => f.weight);
    for (const e of examples) this.add(e.label, e.f, e.source);
  }

  add(label: string, signature: number[], source = 'taught'): void {
    if (!(this.spec.labels as readonly string[]).includes(label)) throw new Error(`Unknown pose label: ${label}`);
    if (signature.length !== this.spec.features.length) throw new Error('Signature has the wrong length');
    this.examples.push({ label: label as L, f: signature, source });
  }

  /** Number of examples per pose, e.g. { attitude: 210, ... }. */
  counts(): Record<L, number> {
    const counts = Object.fromEntries(this.spec.labels.map((p) => [p, 0])) as Record<L, number>;
    for (const e of this.examples) counts[e.label] += 1;
    return counts;
  }

  /** Can the library be trusted for this pose (enough examples)? */
  knows(label: L, s = RECOGNIZER_SETTINGS): boolean {
    return this.counts()[label] >= s.minExamplesPerPose;
  }

  /**
   * Which pose is this signature?
   * pose is null when nothing is close enough, the vote is unclear, or the winner is 'none'.
   */
  recognize(signature: number[], s = RECOGNIZER_SETTINGS): Recognition<L> {
    if (this.examples.length === 0) return { pose: null, confidence: 0, distance: Infinity };
    const nearest = this.examples
      .map((e) => ({ label: e.label, d: distance(signature, e.f, this.weights) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, s.k);
    const votes: Partial<Record<L, number>> = {};
    for (const n of nearest) votes[n.label] = (votes[n.label] ?? 0) + 1 / (n.d + 0.02);
    const total = (Object.values(votes) as number[]).reduce((a, b) => a + b, 0);
    const [winner, score] = (Object.entries(votes) as [L, number][]).sort((a, b) => b[1] - a[1])[0];
    const confidence = score / total;
    const closest = nearest[0].d;
    const pose = winner !== 'none' && closest <= s.maxDistance && confidence >= s.minConfidence
      ? winner
      : null;
    return { pose, confidence, distance: closest, winner };
  }

  toJSON(): LibraryJSON {
    return {
      version: LIBRARY_VERSION,
      features: this.spec.features.map((f) => f.name),
      examples: this.examples.map((e) => ({ label: e.label, f: e.f.map(round3), source: e.source })),
    };
  }

  static fromJSON<L extends string = PoseLabel>(
    data: LibraryJSON | null | undefined,
    spec: LibrarySpec<L> = GYMNASTICS_SPEC as unknown as LibrarySpec<L>,
  ): PoseLibrary<L> {
    if (!data || data.version !== LIBRARY_VERSION) throw new Error('Unsupported pose library file');
    return new PoseLibrary<L>(data.examples, spec);
  }
}

/** Weighted distance between two signatures. */
function distance(a: number[], b: number[], weights: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] - b[i]) * weights[i];
    sum += d * d;
  }
  return Math.sqrt(sum / a.length);
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
