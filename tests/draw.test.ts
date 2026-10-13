import { test, assertClose, assertEqual } from './harness';
import { legAngles } from '../lib/draw';
import { splitPose } from '../lib/library/examples/poses';

test('legAngles: full split is green at the hips, both knees straight', () => {
  const [split, ...knees] = legAngles(splitPose(180));
  assertClose(split.deg, 180, 1);
  assertEqual(split.color, '#4cc38a');
  assertEqual(knees.length, 2);
  for (const knee of knees) assertClose(knee.deg, 180, 1);
});

test('legAngles: colors follow the deduction bands', () => {
  assertEqual(legAngles(splitPose(165))[0].color, '#f2b544'); // 15° short
  assertEqual(legAngles(splitPose(150))[0].color, '#f0606e'); // 30° short
});

test('legAngles: hidden legs get no labels', () => {
  const lm = splitPose(180).map((p) => ({ ...p, visibility: 0 }));
  assertEqual(legAngles(lm).length, 0);
});
