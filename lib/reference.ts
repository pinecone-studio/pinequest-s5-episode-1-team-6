// Reference videos: a balance done right, shown next to a practice move that lost points, so the
// gymnast sees how it should look (user, 2026-10-14). Rhythmic gymnastics only.
// Small demo clips in public/reference/ (trimmed and cropped, 0.4-0.6 MB each; the only videos in git).
// The originals stay out of git, in data/reference/ (see data/README.md).

import type { Sport } from './sport';

/** Element code -> clip. Each clip was judged by the app itself: the same element, no points lost. */
const BY_CODE: Record<string, string> = {
  '2.303': '/reference/front-split-with-help.mp4', // front split, holding the leg
  '2.1104': '/reference/back-split-body-forward.mp4', // back split, body forward
  '2.1202': '/reference/attitude.mp4', // attitude
};

/** The clip that shows this element done right, or null (other sports, or no clip for it yet). */
export function referenceVideoFor(sport: Sport, code: string): string | null {
  return sport === 'gymnastics' ? BY_CODE[code] ?? null : null;
}

/** Every clip, for tests that check the files are there. */
export const REFERENCE_VIDEOS: readonly string[] = Object.values(BY_CODE);
