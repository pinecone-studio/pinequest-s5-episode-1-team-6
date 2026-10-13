// Pure helpers for the move videos: where a move is in the routine recording, which moves get a
// video, and file names. No browser APIs, so they are unit tested (tests/clipWindows.test.ts).

import type { Landmarks } from '../geometry';
import type { ElementEvent } from '../types';

/** One recorded frame: the session clock (the clock event times use), the time in the recording and
 * the body seen (original video pixels), so the mistake can be marked on the video. */
export interface TimelinePoint {
  t: number;
  recMs: number;
  lm?: Landmarks | null;
}

/** The video starts this long before the move and ends this long after it (user, 2026-10-13). */
export const CLIP_MARGIN_MS = 1000;

/** Where to cut one move, in recording time: the clip, the move itself (marked red) and the photo. */
export interface ClipWindow {
  fromMs: number;
  toMs: number;
  holdFromMs: number;
  holdToMs: number;
  photoMs: number; // middle of the move
}

/**
 * Recording time of session time `t`: the recorded frame closest to it. When a clip was jumped back
 * in and played again, the same time appears twice; the later recording wins (that is when the move
 * was judged).
 */
export function recTimeFor(timeline: TimelinePoint[], t: number): number | null {
  let best: TimelinePoint | null = null;
  for (const point of timeline) {
    if (!best || Math.abs(point.t - t) <= Math.abs(best.t - t)) best = point;
  }
  return best ? best.recMs : null;
}

/** The part of the recording that shows `event`, or null when the recording does not cover it. */
export function clipWindow(
  event: Pick<ElementEvent, 'tStart' | 'tEnd'>,
  timeline: TimelinePoint[],
  recordingMs: number,
): ClipWindow | null {
  const start = recTimeFor(timeline, event.tStart);
  const end = recTimeFor(timeline, event.tEnd);
  if (start === null || end === null) return null;
  const last = Math.max(start, end);
  const fromMs = Math.max(0, start - CLIP_MARGIN_MS);
  const toMs = Math.min(recordingMs, last + CLIP_MARGIN_MS);
  if (toMs - fromMs < 200) return null; // nothing worth showing
  return { fromMs, toMs, holdFromMs: start, holdToMs: last, photoMs: (start + last) / 2 };
}

/** The body seen at recording time `recMs` (nearest recorded frame), or null. Timeline is in recording order. */
export function landmarksAt(timeline: TimelinePoint[], recMs: number): Landmarks | null {
  if (timeline.length === 0) return null;
  let lo = 0;
  let hi = timeline.length - 1;
  while (lo < hi) {
    const middle = (lo + hi) >> 1;
    if (timeline[middle].recMs < recMs) lo = middle + 1;
    else hi = middle;
  }
  const before = timeline[Math.max(0, lo - 1)];
  const nearest = Math.abs(before.recMs - recMs) < Math.abs(timeline[lo].recMs - recMs) ? before : timeline[lo];
  return nearest.lm ?? null;
}

/** Moves that lost points get a video and a photo. */
export function movesNeedingClips<T extends Pick<ElementEvent, 'penalties'>>(events: T[]): T[] {
  return events.filter((e) => e.penalties.length > 0);
}

/** "rhymnast-2026-10-13-1530-move-2-attitude.mp4": date and time (local), move number, move name. */
export function clipFileName(when: Date, number: number, name: string, extension: string): string {
  const two = (n: number) => String(n).padStart(2, '0');
  const date = `${when.getFullYear()}-${two(when.getMonth() + 1)}-${two(when.getDate())}-${two(when.getHours())}${two(when.getMinutes())}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `rhymnast-${date}-move-${number}-${slug}.${extension}`;
}

/** File extension for a recorded video type. */
export function videoExtension(mimeType: string): string {
  return mimeType.includes('mp4') ? 'mp4' : 'webm';
}
