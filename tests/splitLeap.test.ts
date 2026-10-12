import { test, assert, assertEqual, assertClose } from './harness';
import { SplitLeapDetector } from '../lib/elements/splitLeap';
import type { ElementEvent } from '../lib/types';
import { standing, splitPose, foreshortenLeg, frames, repeat } from './poses';

/** Stand, leap with the given split, land. Returns detector events. */
function leap(splitDeg: number, { flightFrames = 12, width = 0.15, foreshorten = 1 } = {}) {
  const events: ElementEvent[] = [];
  const detector = new SplitLeapDetector((e) => events.push(e));
  const seq = [
    ...repeat(15, () => standing()),
    ...repeat(flightFrames, () => foreshortenLeg(splitPose(splitDeg, { width }), 'L', foreshorten)),
    ...repeat(15, () => standing()),
  ];
  for (const f of frames(seq)) detector.update(f);
  return events;
}

test('split leap 180°: DB valid 0.30, no penalty', () => {
  const [e, ...rest] = leap(180);
  assert(e && rest.length === 0, 'expected exactly one event');
  assertEqual(e.code, '1.2103');
  assertClose(e.measurements.peakSplitDeg!, 180, 1);
  assert(e.dbValid && e.dbValue === 0.3, 'DB should be valid 0.30');
  assertEqual(e.penalties.length, 0);
  assertEqual(e.warnings.length, 0, 'side-on leap should have no warnings');
});

test('split leap 200° (over-split): no penalty', () => {
  const [e] = leap(200);
  assert(e.dbValid && e.penalties.length === 0);
});

test('split leap 172°: small deviation, E -0.10, DB valid', () => {
  const [e] = leap(172);
  assertEqual(e.measurements.band, 'small');
  assert(e.dbValid);
  assertEqual(e.penalties[0].value, 0.1);
});

test('split leap 165°: medium deviation, E -0.30, DB valid', () => {
  const [e] = leap(165);
  assertEqual(e.measurements.band, 'medium');
  assert(e.dbValid);
  assertEqual(e.penalties[0].value, 0.3);
});

test('split leap 150°: large deviation, E -0.50, DB NOT valid', () => {
  const [e] = leap(150);
  assertEqual(e.measurements.band, 'large');
  assert(!e.dbValid && e.dbValue === 0);
  assertEqual(e.penalties[0].value, 0.5);
});

test('jump with legs together is not a split leap', () => {
  assertEqual(leap(40).length, 0);
});

test('2-frame blip is not a leap (minimum flight time)', () => {
  assertEqual(leap(180, { flightFrames: 2 }).length, 0);
});

test('standing still produces no events', () => {
  const events: ElementEvent[] = [];
  const d = new SplitLeapDetector((e) => events.push(e));
  for (const f of frames(repeat(60, () => standing()))) d.update(f);
  assertEqual(events.length, 0);
});

test('shoulders/hips open to the audience but legs side-on: no camera warning', () => {
  const [e] = leap(180, { width: 0.6 });
  assertEqual(e.warnings.length, 0);
});

test('one leg pointing at the camera (foreshortened): flagged as unreliable', () => {
  const [e] = leap(180, { foreshorten: 0.6 });
  assert(e.warnings.some((w) => w.includes('foreshortened')));
});
