import { test, assert, assertEqual } from './harness';
import { PasseDetector } from '../lib/elements/passe';
import type { ElementEvent } from '../lib/types';
import type { Landmarks } from '../lib/geometry';
import { standing, passePose, splitPose, frames, repeat } from '../lib/library/examples/poses';

function run(seq: Landmarks[]) {
  const events: ElementEvent[] = [];
  const d = new PasseDetector((e) => events.push(e));
  for (const f of frames(seq)) d.update(f);
  d.flush();
  return events;
}

const hold = (n: number, opts?: Parameters<typeof passePose>[0]) => [
  ...repeat(10, () => standing()),
  ...repeat(n, () => passePose(opts)),
  ...repeat(10, () => standing()),
];

test('passé balance held 1.3 s on relevé: DB 0.10, no penalty', () => {
  const [e, ...rest] = run(hold(40));
  assert(e && rest.length === 0, 'expected one event');
  assertEqual(e.code, '2.101');
  assert(e.dbValid && e.dbValue === 0.1);
  assertEqual(e.penalties.length, 0);
});

test('passé balance held 0.6 s: valid, E -0.30 "not held 1 second"', () => {
  const [e] = run(hold(19));
  assert(e.dbValid);
  assert(e.penalties.some((p) => p.value === 0.3 && p.reason.includes('1 second')));
});

test('passé balance on flat foot: value reduced to 0.00', () => {
  const [e] = run(hold(40, { releve: false }));
  assertEqual(e.dbValue, 0);
  assert(!e.dbValid);
  assert(e.warnings.some((w) => w.includes('flat foot')));
});

test('passé thigh 15° below horizontal: medium deviation, E -0.30', () => {
  const [e] = run(hold(40, { thighDeg: 75 }));
  assertEqual(e.measurements.band, 'medium');
  assert(e.dbValid);
  assertEqual(e.penalties[0].value, 0.3);
});

test('very short passé (passing movement) is ignored', () => {
  assertEqual(run(hold(5)).length, 0);
});

/** Passé held while turning `totalDeg`, starting side-on. */
function pivot(totalDeg: number, n = 60) {
  const seq = [
    ...repeat(10, () => standing({ width: 0.7 })), // facing camera first: learn max width
    ...repeat(n, (i) => {
      const phase = (totalDeg * i) / (n - 1);
      return passePose({ width: 0.7 * Math.abs(Math.sin((phase * Math.PI) / 180)) });
    }),
    ...repeat(10, () => standing({ width: 0.7 })),
  ];
  return run(seq);
}

test('passé pivot 720°: 2 rotations, DB 0.20', () => {
  const [e] = pivot(720);
  assertEqual(e.code, '3.101');
  assertEqual(e.measurements.rotations, 2);
  assertEqual(e.dbValue, 0.2);
});

test('passé pivot 380°: 1 rotation, DB 0.10', () => {
  const [e] = pivot(380, 30);
  assertEqual(e.measurements.rotations, 1);
  assertEqual(e.dbValue, 0.1);
});

test('half turn in passé: pivot not valid (under 360°)', () => {
  const [e] = pivot(200, 20);
  assert(!e.dbValid && e.element.includes('under 360'));
});

test('straight-leg split is not mistaken for a passé', () => {
  assertEqual(run(repeat(30, () => splitPose(180, { rise: 0 }))).length, 0);
});

test('airborne frames are never a passé', () => {
  const events: ElementEvent[] = [];
  const d = new PasseDetector((e) => events.push(e));
  for (const f of frames(repeat(40, () => passePose()))) d.update({ ...f, airborne: true });
  d.flush();
  assertEqual(events.length, 0);
});
