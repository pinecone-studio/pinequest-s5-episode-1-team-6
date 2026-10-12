// "Record 3 s" in Teach poses: a 3-2-1 countdown, then every camera frame for 3 seconds becomes
// an example of the chosen pose. The app calls capture() for every frame; the Teach poses panel
// (components/TeachPanel.tsx) starts it and saves the result in the pose library.

import type { Landmarks } from '../geometry';
import { balanceFrame, legsUsable } from '../elements/balanceFrame';
import { poseSignature } from '../library/signature';
import { POSE_NAMES, type PoseLabel } from '../library/recognizer';

const COUNTDOWN_MS = 3000;
const RECORD_MS = 3000;

interface Recording {
  label: PoseLabel;
  startAt: number;
  signatures: number[][];
}

export class TeachRecorder {
  private recording: Recording | null = null;

  /** @param onDone called with the examples when the 3 seconds are over (may be empty) */
  constructor(private onDone: (label: PoseLabel, signatures: number[][]) => void) {}

  get busy(): boolean {
    return this.recording !== null;
  }

  start(label: PoseLabel, now = performance.now()): void {
    this.recording = { label, startAt: now + COUNTDOWN_MS, signatures: [] };
  }

  /**
   * Called for every camera frame. Returns a message for the video overlay while counting down
   * or recording, otherwise null.
   */
  capture(lm: Landmarks | null, airborne: boolean, now = performance.now()): string | null {
    const r = this.recording;
    if (!r) return null;
    const name = POSE_NAMES[r.label];
    if (now < r.startAt) return `Get into ${name}… ${Math.ceil((r.startAt - now) / 1000)}`;
    if (now < r.startAt + RECORD_MS) {
      if (lm && !airborne && legsUsable(lm).ok) {
        const f = balanceFrame(lm);
        if (f) r.signatures.push(poseSignature(f));
      }
      return `Recording ${name}: hold it · ${((r.startAt + RECORD_MS - now) / 1000).toFixed(1)} s · ${r.signatures.length} examples`;
    }
    this.recording = null;
    this.onDone(r.label, r.signatures);
    return null;
  }
}
