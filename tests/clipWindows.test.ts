import { test, assert, assertEqual } from './harness';
import { CLIP_MARGIN_MS, clipFileName, clipWindow, movesNeedingClips, recTimeFor, videoExtension } from '../lib/recording/clipWindows';
import { routinesToDelete, type SavedRoutine } from '../lib/recording/clipStore';

// A camera routine: session clock starts at 50 000 ms, one frame every 100 ms, recording from 0.
const timeline = Array.from({ length: 101 }, (_, i) => ({ t: 50_000 + i * 100, recMs: i * 100 }));

test('session times map to recording times', () => {
  assertEqual(recTimeFor(timeline, 52_000), 2000);
  assertEqual(recTimeFor(timeline, 52_049), 2000); // nearest frame
  assertEqual(recTimeFor(timeline, 1_000), 0); // before the recording: its start
  assertEqual(recTimeFor([], 52_000), null);
});

test('after jumping back in a clip, the later playing of the same moment wins', () => {
  const replayed = [{ t: 1000, recMs: 0 }, { t: 2000, recMs: 1000 }, { t: 1000, recMs: 5000 }, { t: 2000, recMs: 6000 }];
  assertEqual(recTimeFor(replayed, 2000), 6000);
});

test('a move video starts 1 s before and ends 1 s after the move', () => {
  const part = clipWindow({ tStart: 53_000, tEnd: 55_000 }, timeline, 10_000);
  assertEqual(CLIP_MARGIN_MS, 1000);
  assertEqual(part?.fromMs, 2000);
  assertEqual(part?.toMs, 6000);
  assertEqual(part?.photoMs, 4000); // photo in the middle of the hold
});

test('a move video stays inside the recording', () => {
  const early = clipWindow({ tStart: 50_200, tEnd: 51_000 }, timeline, 10_000);
  assertEqual(early?.fromMs, 0);
  const late = clipWindow({ tStart: 59_000, tEnd: 60_000 }, timeline, 10_000);
  assertEqual(late?.toMs, 10_000);
  assertEqual(clipWindow({ tStart: 53_000, tEnd: 55_000 }, [], 10_000), null);
});

test('only moves that lost points get a video', () => {
  const moves = [
    { id: 1, penalties: [] },
    { id: 2, penalties: [{ reason: 'Trunk', value: 0.3, ref: '#2.5.3', segment: 'trunk' }] },
  ];
  assertEqual(movesNeedingClips(moves).map((m) => m.id).join(), '2');
});

test('file names say when, which move and what it was', () => {
  const when = new Date(2026, 9, 13, 15, 7);
  assertEqual(clipFileName(when, 2, 'Back split, foot above the head', 'mp4'), 'rhymnast-2026-10-13-1507-move-2-back-split-foot-above-the-head.mp4');
  assertEqual(videoExtension('video/webm;codecs=vp9'), 'webm');
  assertEqual(videoExtension('video/mp4;codecs=avc1'), 'mp4');
});

test('only the newest 10 routines are kept', () => {
  const routines: SavedRoutine[] = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, createdAt: i, pointsLost: 0, videos: 1 }));
  const old = routinesToDelete(routines);
  assertEqual(old.map((r) => r.id).join(), 'r1,r0');
  assert(routinesToDelete(routines.slice(0, 10)).length === 0);
});
