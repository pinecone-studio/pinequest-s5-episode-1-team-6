// Pose library: recognizes the balances by comparing a frame's pose signature with many
// labeled examples of the correct poses (and of poses that are NOT ours), nearest neighbours.
// Nothing is trained in the machine-learning sense: adding examples is the "learning".

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

export const RECOGNIZER_SETTINGS = {
  k: 7, // neighbours that vote
  maxDistance: 0.35, // nearest example farther than this: unknown pose
  minConfidence: 0.6, // share of the vote the winner needs
  minExamplesPerPose: 5, // below this the library doesn't vote for that pose
};
export type RecognizerSettings = typeof RECOGNIZER_SETTINGS;

const WEIGHTS = FEATURES.map((f) => f.weight);

export interface Example {
  label: PoseLabel;
  f: number[];
  source: string;
}

/** A pose library as saved in a JSON file. */
export interface LibraryJSON {
  version: number;
  features?: string[];
  examples: { label: string; f: number[]; source?: string }[];
}

export interface Recognition {
  pose: PoseLabel | null;
  confidence: number;
  distance: number;
  winner?: string;
}

export class PoseLibrary {
  examples: Example[] = [];

  constructor(examples: { label: string; f: number[]; source?: string }[] = []) {
    for (const e of examples) this.add(e.label, e.f, e.source);
  }

  add(label: string, signature: number[], source = 'taught'): void {
    if (!(POSES as readonly string[]).includes(label)) throw new Error(`Unknown pose label: ${label}`);
    if (signature.length !== FEATURES.length) throw new Error('Signature has the wrong length');
    this.examples.push({ label: label as PoseLabel, f: signature, source });
  }

  /** Number of examples per pose, e.g. { attitude: 210, ... }. */
  counts(): Record<PoseLabel, number> {
    const counts = Object.fromEntries(POSES.map((p) => [p, 0])) as Record<PoseLabel, number>;
    for (const e of this.examples) counts[e.label] += 1;
    return counts;
  }

  /** Can the library be trusted for this pose (enough examples)? */
  knows(label: PoseLabel, s = RECOGNIZER_SETTINGS): boolean {
    return this.counts()[label] >= s.minExamplesPerPose;
  }

  /**
   * Which pose is this signature?
   * pose is null when nothing is close enough, the vote is unclear, or the winner is 'none'.
   */
  recognize(signature: number[], s = RECOGNIZER_SETTINGS): Recognition {
    if (this.examples.length === 0) return { pose: null, confidence: 0, distance: Infinity };
    const nearest = this.examples
      .map((e) => ({ label: e.label, d: distance(signature, e.f) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, s.k);
    const votes: Partial<Record<PoseLabel, number>> = {};
    for (const n of nearest) votes[n.label] = (votes[n.label] ?? 0) + 1 / (n.d + 0.02);
    const total = Object.values(votes).reduce((a, b) => a + b, 0);
    const [winner, score] = (Object.entries(votes) as [PoseLabel, number][]).sort((a, b) => b[1] - a[1])[0];
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
      features: FEATURES.map((f) => f.name),
      examples: this.examples.map((e) => ({ label: e.label, f: e.f.map(round3), source: e.source })),
    };
  }

  static fromJSON(data: LibraryJSON | null | undefined): PoseLibrary {
    if (!data || data.version !== LIBRARY_VERSION) throw new Error('Unsupported pose library file');
    return new PoseLibrary(data.examples);
  }
}

/** Weighted distance between two signatures. */
function distance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] - b[i]) * WEIGHTS[i];
    sum += d * d;
  }
  return Math.sqrt(sum / a.length);
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
