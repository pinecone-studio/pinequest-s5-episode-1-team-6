// "Record 3 s" in Teach poses: a 3-2-1 countdown, then every camera frame for 3 seconds becomes
// an example of the chosen pose. The app calls capture() for every frame; the Teach poses panel
// (components/TeachPanel.tsx) starts it and saves the result in the sport's pose library
// (the teach kit, lib/ui/teachKits.ts, says how to measure a frame for that library).

import type { Landmarks } from '../geometry';
import type { TeachKit } from './teachKits';

const COUNTDOWN_MS = 3000;
const RECORD_MS = 3000;

interface Recording {
  kit: TeachKit;
  label: string;
  startAt: number;
  signatures: number[][];
}

export class TeachRecorder {
  private recording: Recording | null = null;

  /** @param onDone called with the examples when the 3 seconds are over (may be empty) */
  constructor(private onDone: (kit: TeachKit, label: string, signatures: number[][]) => void) {}

  get busy(): boolean {
    return this.recording !== null;
  }

  start(kit: TeachKit, label: string, now = performance.now()): void {
    this.recording = { kit, label, startAt: now + COUNTDOWN_MS, signatures: [] };
  }

  /** Stops without saving anything (the sport changed). */
  cancel(): void {
    this.recording = null;
  }

  /**
   * Called for every camera frame. Returns a message for the video overlay while counting down
   * or recording, otherwise null.
   */
  capture(lm: Landmarks | null, airborne: boolean, now = performance.now()): string | null {
    const r = this.recording;
    if (!r) return null;
    const name = r.kit.names[r.label];
    if (now < r.startAt) return `Get into ${name}… ${Math.ceil((r.startAt - now) / 1000)}`;
    if (now < r.startAt + RECORD_MS) {
      const signature = lm && !airborne ? r.kit.signatureOf(lm) : null;
      if (signature) r.signatures.push(signature);
      return `Recording ${name}: hold it · ${((r.startAt + RECORD_MS - now) / 1000).toFixed(1)} s · ${r.signatures.length} examples`;
    }
    this.recording = null;
    this.onDone(r.kit, r.label, r.signatures);
    return null;
  }
}
