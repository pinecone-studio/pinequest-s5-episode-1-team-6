// The ballet pose library: which held ballet pose is this? Same nearest-neighbour library as the
// gymnastics balances (lib/library/recognizer.ts), with its own labels and signature (frame.ts).
// Default examples: lib/ballet/defaultLibrary.json, made by `npm run build-library` from the synthetic
// poses in lib/ballet/examples/poses.ts. Teams add their own in Settings → Teach poses.

import type { LibraryJSON, LibrarySpec } from '../library/recognizer';
import { createLibraryStore } from '../ui/libraryStore';
import { BALLET_FEATURES } from './frame';
import defaultBalletLibrary from './defaultLibrary.json';

// 'none' examples teach the library what to reject (standing, tendu, coupé, penché...).
export const BALLET_LABELS = ['arabesque', 'attitude', 'devant', 'seconde', 'retire', 'plie', 'none'] as const;
export type BalletLabel = (typeof BALLET_LABELS)[number];
export type BalletPose = Exclude<BalletLabel, 'none'>;

export const BALLET_POSE_NAMES: Record<BalletLabel, string> = {
  arabesque: 'Arabesque',
  attitude: 'Attitude',
  devant: 'Développé devant',
  seconde: 'À la seconde',
  retire: 'Retiré',
  plie: 'Plié',
  none: 'Not one of these',
};

export const BALLET_SPEC: LibrarySpec<BalletLabel> = { labels: BALLET_LABELS, features: BALLET_FEATURES };

/** Default + taught ballet examples (taught ones kept in this browser). */
export const balletLibrary = createLibraryStore<BalletLabel>(
  'rhymnast.taughtPoses.ballet.v1', BALLET_SPEC, defaultBalletLibrary as LibraryJSON,
);
