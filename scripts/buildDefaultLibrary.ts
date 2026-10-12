// Builds the default pose library shipped with the app (lib/library/defaultLibrary.json).
// Regenerate with: npm run build-library
//
// Examples come from:
//   - synthetic skeletons of each pose over the range of angles judges see (clean and faulty, so a
//     faulty attempt is still recognized and then judged), both facing directions, varied body
//     width, trunk lean and relevé, plus random measurement noise;
//   - "not these" poses the app must reject (standing, passé, arabesque, ring, back split with help,
//     trunk-forward and trunk-back splits, leg forward at the horizontal);
//   - the real competition photos in lib/library/examples/real-balances.json.

import { PoseLibrary, type PoseLabel } from '../lib/library/recognizer';
import type { Landmarks } from '../lib/geometry';
import { poseSignature } from '../lib/library/signature';
import { balanceFrame } from '../lib/elements/balanceFrame';
import { shapeFromKey } from '../lib/elements/balances';
import {
  standing, passePose, frontSplitBalance, backSplitBalance, arabesqueBalance, attitudeBalance,
} from '../lib/library/examples/poses';
import realPhotos from '../lib/library/examples/real-balances.json';

/** Small seeded random generator, so the library is the same every time it's built. */
function makeRandom(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildDefaultLibrary({ includePhotos = true, perPose = 160, perNegative = 40 } = {}) {
  const rand = makeRandom(20261008);
  const between = (lo: number, hi: number) => lo + (hi - lo) * rand();
  const pick = <T>(...options: T[]): T => options[Math.floor(rand() * options.length)];
  const common = () => ({ facing: pick(1, -1), releve: rand() < 0.8, width: between(0.1, 0.6) });
  // Landmark noise like a real pose model: ±2-3 px on a 100 px torso.
  const noisy = (lm: Landmarks) => lm.map((p) => ({ x: p.x + (rand() - 0.5) * 5, y: p.y + (rand() - 0.5) * 5, visibility: p.visibility }));

  const library = new PoseLibrary();
  const add = (label: PoseLabel, make: () => Landmarks, n: number, source = 'synthetic') => {
    for (let i = 0; i < n; i++) {
      const f = balanceFrame(noisy(make()));
      if (f) library.add(label, poseSignature(f), source);
    }
  };

  // ---------- The three poses (clean and with faults up to ~25°) ----------
  add('frontSplitHelp', () => frontSplitBalance({ ...common(), help: true, splitDeg: between(155, 188), trunkTilt: between(-40, 10) }), perPose);
  add('frontSplit', () => frontSplitBalance({ ...common(), help: false, splitDeg: between(155, 188), trunkTilt: between(-40, 10) }), perPose);
  add('backSplitFootAboveHead', () => backSplitBalance({ ...common(), legDeg: between(130, 178), trunkTilt: between(12, 50) }), perPose);
  add('backSplitTrunkForward', () => backSplitBalance({ ...common(), legDeg: between(150, 186), trunkTilt: between(70, 125) }), perPose);
  add('attitude', () => attitudeBalance({ ...common(), thighDeg: between(65, 115), kneeDeg: between(70, 125), trunkTilt: between(0, 30) }), perPose);

  // ---------- Not one of these ----------
  add('none', () => standing({ width: between(0.1, 0.7) }), perNegative);
  add('none', () => passePose({ ...common(), thighDeg: between(65, 105) }), perNegative);
  add('none', () => arabesqueBalance({ ...common(), legDeg: between(80, 110) }), perNegative);
  add('none', () => attitudeBalance({ ...common(), help: true, thighDeg: between(90, 140), kneeDeg: between(40, 90) }), perNegative); // ring with help
  add('none', () => attitudeBalance({ ...common(), thighDeg: between(125, 150), kneeDeg: between(35, 60) }), perNegative); // ring without help
  add('none', () => backSplitBalance({ ...common(), help: true, legDeg: between(150, 178), trunkTilt: between(12, 60) }), perNegative); // back split with help
  add('none', () => frontSplitBalance({ ...common(), help: pick(true, false), splitDeg: between(165, 195), trunkTilt: between(-85, -55) }), perNegative); // trunk bent back
  add('none', () => frontSplitBalance({ ...common(), help: false, splitDeg: between(80, 115) }), perNegative); // leg forward at horizontal

  // ---------- Real competition photos ----------
  if (includePhotos) {
    for (const photo of realPhotos) {
      const lm = photo.lm.map(([x, y, visibility]) => ({ x, y, visibility }));
      const f = balanceFrame(lm);
      if (f) library.add(shapeFromKey(photo.expected), poseSignature(f), `photo:${photo.id}`);
    }
  }
  return library;
}
