// The team's own videos, replayed through every detector like the live app (lib/tools/replay.ts).
// Fixtures = body points only (numbers, no images), made with /tools/video-analyze → Export body
// points (or the same MediaPipe heavy model at 15 frames/s). Videos themselves are never committed.
// See docs/validation.md (2026-10-13) for what each clip shows.

import { readFileSync } from 'node:fs';
import { test, assert, assertEqual } from './harness';
import { replayBalletLandmarks, replayLandmarks, type LandmarkRecording } from '../lib/tools/replay';
import { BALLET_SPEC, type BalletLabel } from '../lib/ballet/library';
import { PoseLibrary, type LibraryJSON } from '../lib/library/recognizer';
import type { ElementEvent } from '../lib/types';

const library = PoseLibrary.fromJSON(JSON.parse(readFileSync('lib/library/defaultLibrary.json', 'utf8')) as LibraryJSON);

function replay(name: string): ElementEvent[] {
  const recording = JSON.parse(readFileSync(`tests/fixtures/videos/${name}.landmarks.json`, 'utf8')) as LandmarkRecording;
  return replayLandmarks(recording, library).events;
}

const codes = (events: ElementEvent[]) => events.map((e) => e.code).join(',');

const balletLibrary = PoseLibrary.fromJSON<BalletLabel>(
  JSON.parse(readFileSync('lib/ballet/defaultLibrary.json', 'utf8')) as LibraryJSON, BALLET_SPEC,
);

/** The same clip judged as ballet (the ballet pose, pirouette and grand jeté detectors). */
function replayBallet(name: string): ElementEvent[] {
  const recording = JSON.parse(readFileSync(`tests/fixtures/videos/${name}.landmarks.json`, 'utf8')) as LandmarkRecording;
  return replayBalletLandmarks(recording, balletLibrary);
}

test('video arabesque_1: two valid arabesques, thigh at the horizontal, trunk 24-27° (4-7° past the natural 20°)', () => {
  const events = replay('arabesque_1');
  assertEqual(codes(events), '2.902,2.902');
  for (const e of events) {
    assert(e.measurements.holdMs! > 2000, 'held over 2 s');
    assert(e.measurements.thighDevDeg! <= 3, 'thigh horizontal');
    assert(e.measurements.trunkDevDeg! >= 3 && e.measurements.trunkDevDeg! <= 8, 'lean past the natural 20°');
    assert(e.dbValid, 'valid');
    assert(e.penalties.every((p) => p.value <= 0.1), 'at most a small deduction');
  }
});

test('video stag_leap_1: one stag leap, not a failed split leap', () => {
  const [e, ...rest] = replay('stag_leap_1');
  assertEqual(rest.length, 0);
  assertEqual(e.code, '1.2702');
  assert(e.dbValid, 'about 166°: medium deviation, valid');
  assert(!e.warnings.some((w) => w.includes('foreshortened')), 'bent front leg is not a camera warning');
});

test('video stag_leap_2: no false move (she runs in while the model still tracks a bystander)', () => {
  // Known limit: her leg points stay under 50% confidence during the jump, so the leap is not judged.
  assertEqual(replay('stag_leap_2').length, 0);
});

// Both pivot clips are about one full turn, right at the 360° line (browser: ~350°). The tests check what
// is solid (one pivot, about one turn, flagged for a judge), not which side of the line it lands on.
for (const name of ['attitude_pivot_1', 'attitude_pivot_2']) {
  test(`video ${name}: one attitude pivot, about one full turn, flagged for a judge, nothing else`, () => {
    const [e, ...rest] = replay(name);
    assertEqual(rest.length, 0, 'not also a balance or a leap:');
    assertEqual(e.code, '3.1203');
    assert(e.measurements.rotationDeg! >= 320 && e.measurements.rotationDeg! <= 400, 'about one turn');
    assert(e.warnings.some((w) => w.includes('Close to a full turn')), 'close call flagged');
    assert(e.measurements.thighDevDeg! >= 10 && e.measurements.thighDevDeg! <= 25, 'thigh ~70° (below horizontal)');
  });
}

test('video front_split_help_1: still two clean front splits with help (2026-10-09 result)', () => {
  const events = replay('front_split_help_1');
  assertEqual(codes(events), '2.303,2.303');
  for (const e of events) assertEqual(e.penalties.length, 0);
});

test('video back_split_trunk_forward_1: still two clean back splits, no arabesque on the way up', () => {
  const events = replay('back_split_trunk_forward_1');
  assertEqual(codes(events), '2.1104,2.1104');
  for (const e of events) assertEqual(e.penalties.length, 0);
});

// ---------- The same clips, judged as ballet (2026-10-14, docs/ballet.md) ----------

test('ballet, video arabesque_1: two arabesques at 93-95°, the 24-27° trunk tilt inside the arabesque allowance', () => {
  const events = replayBallet('arabesque_1');
  assertEqual(codes(events), 'BA.ARABESQUE,BA.ARABESQUE');
  for (const e of events) {
    assert(e.measurements.extensionDeg! >= 90, 'leg at 90° or higher');
    assertEqual(e.penalties.length, 0, 'no points lost:');
  }
});

test('ballet, gymnastics-only clips: no ballet move called', () => {
  // Front split held by the hand (a stretch), a turn in attitude (the retiré it passes is no balance),
  // the plié before it (0.5 s), back split into penché (passes under 0.7 s), stag leaps (no grand jeté).
  for (const name of ['front_split_help_1', 'attitude_pivot_1', 'attitude_pivot_2', 'back_split_trunk_forward_1', 'stag_leap_1', 'stag_leap_2']) {
    assertEqual(codes(replayBallet(name)), '', `${name}:`);
  }
});
