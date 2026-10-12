import { test, assert, assertEqual, assertClose } from './harness';
import { PoseLibrary, POSES } from '../lib/library/recognizer';
import { poseSignature } from '../lib/library/signature';
import { balanceFrame } from '../lib/elements/balanceFrame';
import { BalanceDetector, measureBalance, libraryIsReady } from '../lib/elements/balances';
import defaultLibraryData from '../lib/library/defaultLibrary.json';
import type { LibraryJSON } from '../lib/library/recognizer';
import type { ElementEvent } from '../lib/types';
import type { Landmarks } from '../lib/geometry';
import {
  standing, passePose, frontSplitBalance, backSplitBalance, arabesqueBalance, attitudeBalance,
  frames, repeat,
} from '../lib/library/examples/poses';

const library = PoseLibrary.fromJSON(defaultLibraryData as LibraryJSON);
const sig = (lm: Landmarks) => poseSignature(balanceFrame(lm)!);
const shapeOf = (lm: Landmarks) => measureBalance(lm, undefined, library).shape;

/** Scale and move a skeleton: a bigger or closer gymnast, elsewhere in the frame. */
const scaled = (lm: Landmarks, k: number, dx: number) => lm.map((p) => ({ ...p, x: p.x * k + dx, y: p.y * k + 40 }));

test('default library knows every pose with plenty of examples', () => {
  const counts = library.counts();
  for (const p of POSES) assert(counts[p] >= 100, `${p}: ${counts[p]}`);
  assert(libraryIsReady(library));
});

test('signature is the same for a bigger gymnast elsewhere in the frame', () => {
  const a = sig(attitudeBalance());
  const b = sig(scaled(attitudeBalance(), 2.3, 150));
  a.forEach((v, i) => assertClose(b[i], v, 0.01, `feature ${i}`));
});

test('signature is the same facing left or right', () => {
  const a = sig(backSplitBalance({ legDeg: 165, facing: 1 }));
  const b = sig(backSplitBalance({ legDeg: 165, facing: -1 }));
  // 0.03: the test skeleton widens the hips after placing the legs, which isn't perfectly mirrored.
  a.forEach((v, i) => assertClose(b[i], v, 0.03, `feature ${i}`));
});

test('library recognizes new, unseen examples of each pose', () => {
  assertEqual(shapeOf(frontSplitBalance({ help: true, splitDeg: 177, facing: -1, width: 0.33 })), 'frontSplitHelp');
  assertEqual(shapeOf(frontSplitBalance({ help: false, splitDeg: 168 })), 'frontSplit');
  assertEqual(shapeOf(backSplitBalance({ legDeg: 161, trunkTilt: 22 })), 'backSplitFootAboveHead');
  assertEqual(shapeOf(attitudeBalance({ thighDeg: 87, kneeDeg: 97, trunkTilt: 8, facing: -1 })), 'attitude');
  assertEqual(shapeOf(backSplitBalance({ legDeg: 178, trunkTilt: 108, facing: -1 })), 'backSplitTrunkForward');
});

test('library still recognizes faulty versions, so they can be judged', () => {
  const m = measureBalance(attitudeBalance({ thighDeg: 73 }), undefined, library);
  assertEqual(m.shape, 'attitude');
  assertClose(m.deviations.find((d) => d.segment === 'thigh')!.deg, 17, 1);
});

test('library rejects look-alikes and other poses', () => {
  for (const [name, lm] of <[string, Landmarks][]>[
    ['standing', standing()],
    ['passé', passePose({ thighDeg: 92 })],
    ['arabesque', arabesqueBalance({ legDeg: 97 })],
    ['ring with help', attitudeBalance({ help: true, thighDeg: 115, kneeDeg: 60 })],
    ['back split with help', backSplitBalance({ help: true, legDeg: 168 })],
    ['front split trunk bent back', frontSplitBalance({ help: true, trunkTilt: -60 })],
  ]) {
    assertEqual(shapeOf(lm), null, `${name}:`);
  }
});

test('with the library: held attitude is judged like before (2.1202, clean)', () => {
  const events: ElementEvent[] = [];
  const d = new BalanceDetector((e) => events.push(e));
  d.library = library;
  for (const f of frames([...repeat(10, () => standing()), ...repeat(40, () => attitudeBalance()), ...repeat(15, () => standing())])) d.update(f);
  assertEqual(events.length, 1);
  assertEqual(events[0].code, '2.1202');
  assertEqual(events[0].penalties.length, 0);
  assertEqual(events[0].recognizedBy, 'library');
});

test('teaching: examples of a new pose change what is recognized', () => {
  // Tiny library: 5 examples per label at fixed points.
  const lib = new PoseLibrary();
  const point = (v: number) => Array(10).fill(v);
  POSES.forEach((p, i) => { for (let k = 0; k < 5; k++) lib.add(p, point(i * 0.1)); });
  const probe = point(0.9); // far from every taught pose (all at 0.5 or lower)
  assertEqual(lib.recognize(probe).pose, null);
  for (let k = 0; k < 10; k++) lib.add('attitude', point(0.9)); // teach it
  assertEqual(lib.recognize(probe).pose, 'attitude');
});

test('library export and import give the same library', () => {
  const copy = PoseLibrary.fromJSON(JSON.parse(JSON.stringify(library.toJSON())));
  assertEqual(copy.examples.length, library.examples.length);
  assertEqual(JSON.stringify(copy.counts()), JSON.stringify(library.counts()));
});
