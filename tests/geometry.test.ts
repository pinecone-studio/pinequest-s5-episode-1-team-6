import { test, assertClose, assert } from './harness';
import { LM, splitAngle, thighElevation, jointAngle, bodyWidthRatio } from '../lib/geometry';
import { OneEuroFilter } from '../lib/oneEuro';
import { deviationBand } from '../lib/rules';
import { standing, splitPose } from '../lib/library/examples/poses';

test('splitAngle: 180° split reads 180', () => {
  assertClose(splitAngle(splitPose(180)), 180, 0.5);
});

test('splitAngle: 90° and 150° splits', () => {
  assertClose(splitAngle(splitPose(90)), 90, 0.5);
  assertClose(splitAngle(splitPose(150)), 150, 0.5);
});

test('splitAngle: over-split 200° reads 200, not 160', () => {
  assertClose(splitAngle(splitPose(200)), 200, 0.5);
});

test('splitAngle: standing legs read near 0', () => {
  assert(splitAngle(standing()) < 10, 'standing split should be small');
});

test('thighElevation: down = 0, horizontal = 90, up = 180', () => {
  const hip = { x: 0, y: 0 };
  assertClose(thighElevation(hip, { x: 0, y: 45 }, 45), 0, 0.1);
  assertClose(thighElevation(hip, { x: 45, y: 0 }, 45), 90, 0.1);
  assertClose(thighElevation(hip, { x: 0, y: -45 }, 45), 180, 0.1);
});

test('thighElevation: same answer when the thigh points at the camera (foreshortened)', () => {
  // Horizontal thigh seen from the front: knee projects onto the hip.
  assertClose(thighElevation({ x: 0, y: 0 }, { x: 3, y: 0 }, 45), 90, 0.1);
});

test('jointAngle: straight leg = 180, right angle = 90', () => {
  assertClose(jointAngle({ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 20 }), 180, 0.1);
  assertClose(jointAngle({ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 10, y: 10 }), 90, 0.1);
});

test('bodyWidthRatio: side-on vs facing camera', () => {
  assertClose(bodyWidthRatio(standing({ width: 0.15 })), 0.15, 0.01);
  assertClose(bodyWidthRatio(standing({ width: 0.7 })), 0.7, 0.01);
});

test('deviationBand: CoP #2.5 bands (≤10 small, 11-20 medium, >20 large)', () => {
  assert(deviationBand(0).band === 'none');
  assert(deviationBand(-15).band === 'none', 'over-split is not a deviation');
  assert(deviationBand(10).band === 'small');
  assert(deviationBand(10.4).band === 'small', '10.4 rounds to 10');
  assert(deviationBand(11).band === 'medium');
  assert(deviationBand(20).band === 'medium');
  assert(deviationBand(21).band === 'large' && deviationBand(21).dbValid === false);
});

test('OneEuroFilter: removes jitter on a still point', () => {
  const f = new OneEuroFilter();
  let out = 0;
  for (let i = 0; i < 60; i++) out = f.filter(100 + (i % 2 ? 3 : -3), i / 30);
  assertClose(out, 100, 1.5);
});

test('LM indices match MediaPipe', () => {
  assert(LM.L_HIP === 23 && LM.R_ANKLE === 28 && LM.R_FOOT === 32);
});
