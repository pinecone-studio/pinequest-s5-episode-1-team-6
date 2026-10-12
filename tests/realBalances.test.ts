// Real photos as regression tests: each fixture is the body landmarks of one labeled photo
// (exported by web/tools/validate.html; no images). The app must recognize the labeled shape and,
// when a judge's deduction is given, deduct the same for the shape.
// Checked twice: with the fixed rules, and with the pose library minus that photo's own example
// (leave-one-out), so a photo can't be recognized just because it is in the library.
import { test, assertEqual } from './harness';
import fixtures from '../lib/library/examples/real-balances.json';
import { analyzeLandmarks } from '../lib/tools/analyzeImage';
import { PoseLibrary } from '../lib/library/recognizer';
import defaultLibraryData from '../lib/library/defaultLibrary.json';
import type { LibraryJSON } from '../lib/library/recognizer';

const fullLibrary = PoseLibrary.fromJSON(defaultLibraryData as LibraryJSON);

if (fixtures.length === 0) {
  test('real photo fixtures: none yet (export them with tools/validate.html)', () => {});
}

for (const f of fixtures) {
  const lm = f.lm.map(([x, y, visibility]) => ({ x, y, visibility }));
  const check = (a: ReturnType<typeof analyzeLandmarks>) => {
    assertEqual(a.shape, f.expected, 'shape:');
    if (f.judgeDeduction != null && f.expected !== 'none') assertEqual(a.deduction, f.judgeDeduction, 'shape deduction:');
  };
  test(`real photo ${f.id} (rules): recognized as ${f.expected}`, () => check(analyzeLandmarks(lm, null)));
  test(`real photo ${f.id} (library, leave-one-out): recognized as ${f.expected}`, () => {
    const library = new PoseLibrary(fullLibrary.examples.filter((e) => e.source !== `photo:${f.id}`));
    check(analyzeLandmarks(lm, library));
  });
}
