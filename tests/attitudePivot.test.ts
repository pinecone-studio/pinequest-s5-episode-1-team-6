import { test, assert, assertEqual, assertClose } from './harness';
import { AttitudePivotDetector } from '../lib/elements/attitudePivot';
import { BalanceDetector } from '../lib/elements/balances';
import { facingAngle } from '../lib/geometry';
import type { ElementEvent } from '../lib/types';
import type { Landmarks } from '../lib/geometry';
import { attitudeTurnPose, standing, frames, repeat } from '../lib/library/examples/poses';

/** Stand, turn `turnDeg` in the attitude over `n` frames (~33 ms each), stand. */
function turn(turnDeg: number, n = 30, opts: Parameters<typeof attitudeTurnPose>[1] = {}) {
  return [
    ...repeat(10, () => standing()),
    ...repeat(n, (i) => attitudeTurnPose((turnDeg * i) / (n - 1), opts)),
    ...repeat(10, () => standing()),
  ];
}

/** Runs the pivot and balance detectors together, like the app does. */
function run(seq: Landmarks[]) {
  const events: ElementEvent[] = [];
  const pivot = new AttitudePivotDetector((e) => events.push(e));
  const balance = new BalanceDetector((e) => events.push(e));
  for (const f of frames(seq)) {
    pivot.update(f);
    balance.update({ ...f, turning: pivot.live.turning });
  }
  pivot.flush();
  balance.flush();
  return events;
}

test('facing angle: 0 facing the camera, ±90 side-on, 180 back to the camera', () => {
  assertClose(Math.abs(facingAngle(attitudeTurnPose(0))), 0, 1);
  assertClose(Math.abs(facingAngle(attitudeTurnPose(90))), 90, 1);
  assertClose(Math.abs(facingAngle(attitudeTurnPose(180))), 180, 1);
});

test('attitude pivot, one full turn, thigh horizontal: 3.1203, DB 0.30, no penalty', () => {
  const events = run(turn(360));
  assertEqual(events.length, 1, 'one move, not a balance as well:');
  const e = events[0];
  assertEqual(e.code, '3.1203');
  assertEqual(e.measurements.rotations, 1);
  assert(e.dbValid && e.dbValue === 0.3);
  assertEqual(e.penalties.length, 0);
});

test('attitude pivot, two turns: +0.20 for the extra turn (#12.2.6) = 0.50', () => {
  const [e] = run(turn(720, 50));
  assertEqual(e.measurements.rotations, 2);
  assertEqual(e.dbValue, 0.5);
});

test('attitude pivot with the thigh 15° low: medium deviation, E -0.30, valid', () => {
  const [e] = run(turn(360, 30, { thighDeg: 75 }));
  assertEqual(e.penalties[0].value, 0.3);
  assert(e.dbValid);
});

test('attitude turned only 200°: under 360°, not valid', () => {
  const [e] = run(turn(200));
  assertEqual(e.code, '3.1203');
  assert(!e.dbValid && e.dbValue === 0);
  assert(e.warnings.some((w) => w.includes('360')));
});

test('attitude held without turning is a balance, not a pivot', () => {
  const events = run([...repeat(10, () => standing()), ...repeat(40, () => attitudeTurnPose(90)), ...repeat(10, () => standing())]);
  assertEqual(events.length, 1);
  assertEqual(events[0].code, '2.1202');
});

test('turning on both feet (no raised leg) is not a pivot', () => {
  const seq = repeat(30, (i) => attitudeTurnPose(12 * i, { thighDeg: 0, kneeDeg: 180 }));
  assertEqual(run(seq).filter((e) => e.code === '3.1203').length, 0);
});
