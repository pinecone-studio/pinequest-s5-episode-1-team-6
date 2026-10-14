// What "Teach poses" needs for each sport that recognizes poses by example: the pose labels and
// names, how to turn a frame into that library's signature, and where taught examples are kept.
// Rhythmic gymnastics (balances) and ballet (poses) have one; cheerleading doesn't use a pose library.

import type { Landmarks } from '../geometry';
import { balanceFrame, legsUsable } from '../elements/balanceFrame';
import { poseSignature } from '../library/signature';
import { POSES, POSE_NAMES, type PoseLabel } from '../library/recognizer';
import { balletFrame, balletSignature } from '../ballet/frame';
import { BALLET_LABELS, BALLET_POSE_NAMES, balletLibrary, type BalletLabel } from '../ballet/library';
import { gymnasticsLibrary, type LibraryStore } from './libraryStore';
import type { Sport } from '../sport';

export interface TeachKit<L extends string = string> {
  labels: readonly L[];
  names: Record<L, string>;
  store: LibraryStore<L>;
  /** Signature of one frame, or null when the body can't be measured (legs not visible...). */
  signatureOf(lm: Landmarks): number[] | null;
  /** How to stand for a recording, in plain words. */
  howTo: string;
  fileName: string; // for "Save taught poses"
}

const gymnasticsKit: TeachKit<PoseLabel> = {
  labels: POSES,
  names: POSE_NAMES,
  store: gymnasticsLibrary,
  signatureOf: (lm) => {
    const f = legsUsable(lm).ok ? balanceFrame(lm) : null;
    return f ? poseSignature(f) : null;
  },
  howTo: 'Show the app correct examples so it recognizes your gymnasts better. Pick the pose, press Record, and hold the correct pose sideways for 3 seconds.',
  fileName: 'rhymnast-poses.json',
};

const balletKit: TeachKit<BalletLabel> = {
  labels: BALLET_LABELS,
  names: BALLET_POSE_NAMES,
  store: balletLibrary,
  signatureOf: (lm) => {
    const f = legsUsable(lm).ok ? balletFrame(lm) : null;
    return f ? balletSignature(f) : null;
  },
  howTo: 'Show the app correct examples so it recognizes your dancers better. Pick the pose, press Record, and hold it for 3 seconds: sideways for arabesque, attitude and développé, facing the camera for à la seconde and plié.',
  fileName: 'rhymnast-ballet-poses.json',
};

/** The teach kit of a sport, or null when it has no pose library (cheerleading). */
export function teachKitFor(sport: Sport): TeachKit | null {
  if (sport === 'gymnastics') return gymnasticsKit as unknown as TeachKit;
  if (sport === 'ballet') return balletKit as unknown as TeachKit;
  return null;
}
