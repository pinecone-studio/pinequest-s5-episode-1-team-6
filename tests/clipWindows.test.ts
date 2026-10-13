import { test, assert, assertEqual } from './harness';
import { CLIP_MARGIN_MS, clipFileName, clipWindow, landmarksAt, recTimeFor, videoExtension } from '../lib/recording/clipWindows';
import { bonesFor, inMistake } from '../lib/recording/annotate';
import { mistakeLabel } from '../lib/ui/plain';
import { LM } from '../lib/geometry';
import { attitudeBalance, standing } from '../lib/library/examples/poses';
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
  assertEqual(part?.holdFromMs, 3000); // the move itself: marked red on the video
  assertEqual(part?.holdToMs, 5000);
});

test('the video knows which body it shows at each moment', () => {
  const a = standing();
  const b = attitudeBalance();
  const withBodies = [{ t: 0, recMs: 0, lm: a }, { t: 100, recMs: 100, lm: b }, { t: 200, recMs: 200, lm: null }];
  assertEqual(landmarksAt(withBodies, 40), a);
  assertEqual(landmarksAt(withBodies, 90), b);
  assertEqual(landmarksAt(withBodies, 500), null); // nobody in view
  assertEqual(landmarksAt([], 0), null);
});

test('the red marks go on the body part that lost points', () => {
  const lm = attitudeBalance(); // one leg raised
  const raisedLeft = lm[LM.L_ANKLE].y < lm[LM.R_ANKLE].y;
  const thigh = bonesFor('thigh', lm);
  assertEqual(thigh.length, 1);
  assertEqual(thigh[0][1], lm[raisedLeft ? LM.L_KNEE : LM.R_KNEE]); // the raised knee, not the standing one
  assertEqual(bonesFor('trunk', lm).length, 1);
  assertEqual(bonesFor('split', lm).length, 4); // both legs
  assertEqual(bonesFor('hold', lm).length, 0); // no body part: shown in the badge
});

test('marks show only while the move is held', () => {
  const marks = { mistakes: [], pointsLost: 0.4, clipFromMs: 2000, clipToMs: 6000, holdFromMs: 3000, holdToMs: 5000 };
  assertEqual(inMistake(marks, 2500), false);
  assertEqual(inMistake(marks, 4000), true);
  assertEqual(inMistake(marks, 5500), false);
});

test('the tag on the video is short', () => {
  assertEqual(mistakeLabel({ segment: 'thigh', value: 0.1, measuredDeg: 6 }), 'Thigh 6° low  −0.10');
  assertEqual(mistakeLabel({ segment: 'trunk', value: 0.3, measuredDeg: 15 }), 'Leaning 15°  −0.30');
  assertEqual(mistakeLabel({ segment: 'hold', value: 0.3, holdMs: 600 }), 'Held 0.6 s, needs 1 s  −0.30');
});

test('a move video stays inside the recording', () => {
  const early = clipWindow({ tStart: 50_200, tEnd: 51_000 }, timeline, 10_000);
  assertEqual(early?.fromMs, 0);
  const late = clipWindow({ tStart: 59_000, tEnd: 60_000 }, timeline, 10_000);
  assertEqual(late?.toMs, 10_000);
  assertEqual(clipWindow({ tStart: 53_000, tEnd: 55_000 }, [], 10_000), null);
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
