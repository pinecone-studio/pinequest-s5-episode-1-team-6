// Replays recorded body points (no video, no pose model) through the same detectors as the live app.
// Used by `npm run replay` and by the video regression tests (tests/videos.test.ts).
// No browser APIs in here: runs in Node too.

import { LandmarkSmoother } from '../oneEuro';
import type { Landmarks } from '../geometry';
import { SplitLeapDetector } from '../elements/splitLeap';
import { PasseDetector } from '../elements/passe';
import { BalanceDetector } from '../elements/balances';
import { AttitudePivotDetector } from '../elements/attitudePivot';
import { balanceFrame } from '../elements/balanceFrame';
import type { PoseLibrary } from '../library/recognizer';
import type { ElementEvent } from '../types';

/**
 * Body points of a recorded video: one entry per analysed frame.
 * lm = 33 MediaPipe points as [x, y, visibility] in pixels, or null when nobody was found.
 */
export interface LandmarkRecording {
  src?: string;
  w: number;
  h: number;
  fps: number;
  frames: { t: number; lm: [number, number, number][] | null }[];
}

export interface ReplayResult {
  events: ElementEvent[];
  frameLines: string[]; // one line of measurements per frame, for tuning
}

/** Runs every detector over a recording, frame by frame, like the live app does. */
export function replayLandmarks(recording: LandmarkRecording, library: PoseLibrary | null): ReplayResult {
  const events: ElementEvent[] = [];
  const onEvent = (e: ElementEvent) => events.push(e);
  const smoother = new LandmarkSmoother();
  const leap = new SplitLeapDetector(onEvent);
  const passe = new PasseDetector(onEvent);
  const pivot = new AttitudePivotDetector(onEvent);
  const balance = new BalanceDetector(onEvent);
  balance.library = library;
  const frameLines: string[] = [];

  for (const frame of recording.frames) {
    let lm: Landmarks | null = null;
    if (frame.lm) lm = smoother.smooth(frame.lm.map(([x, y, visibility]) => ({ x, y, visibility })), frame.t / 1000);
    else smoother.reset();
    leap.update({ t: frame.t, lm });
    passe.update({ t: frame.t, lm, airborne: leap.live.airborne });
    pivot.update({ t: frame.t, lm });
    // Turning in an attitude is a pivot, not a balance: the balance detector skips those frames.
    balance.update({ t: frame.t, lm, airborne: leap.live.airborne, turning: pivot.live.turning });
    frameLines.push(frameLine(frame.t, lm, leap.live.airborne, balance.live.label ?? balance.live.hint ?? ''));
  }
  passe.flush();
  pivot.flush();
  balance.flush();
  events.sort((a, b) => a.tStart - b.tStart);
  return { events, frameLines };
}

function frameLine(t: number, lm: Landmarks | null, airborne: boolean, state: string): string {
  const f = lm ? balanceFrame(lm) : null;
  if (!f) return `${(t / 1000).toFixed(2)}  -`;
  const r = Math.round;
  return `${(t / 1000).toFixed(2)}  ${airborne ? 'AIR ' : ''}split ${r(f.split)} knee ${r(f.freeKnee)} thigh ${r(f.thighDeg)} legUp ${r(f.legUp)}`
    + ` lean ${r(f.lean)} trunk ${r(f.trunk)} fwd ${f.forward} raised ${f.raised} full ${f.fullLegs} releve ${f.releve}  ${state}`;
}
