import { test, assert, assertEqual, assertClose } from './harness';
import { PoseLibrary, type LibraryJSON } from '../lib/library/recognizer';
import { BALLET_LABELS, BALLET_SPEC, balletLibrary, type BalletLabel } from '../lib/ballet/library';
import defaultBalletLibrary from '../lib/ballet/defaultLibrary.json';
import { balletFrame, balletSignature } from '../lib/ballet/frame';
import { BalletPoseDetector, balletLibraryReady, measureBalletPose, rulePose } from '../lib/ballet/poses';
import { PirouetteDetector } from '../lib/ballet/pirouette';
import { GrandJeteDetector } from '../lib/ballet/jete';
import { balletRuleTextFor } from '../lib/ballet/rules';
import { Scoreboard } from '../lib/scoring';
import { buildReport } from '../lib/report';
import { describeMove, mistakeLabel } from '../lib/ui/plain';
import {
  balletArabesque, balletAttitude, balletDevant, balletPlie, balletRetireFront, balletRetireSide, balletSeconde,
  balletStandingFront, balletTenduSeconde, retireTurnPose,
} from '../lib/ballet/examples/poses';
import { frontSplitBalance, splitPose, standing, frames, repeat } from '../lib/library/examples/poses';
import type { ElementEvent } from '../lib/types';
import type { Landmarks } from '../lib/geometry';

const library = PoseLibrary.fromJSON<BalletLabel>(defaultBalletLibrary as LibraryJSON, BALLET_SPEC);
const poseOf = (lm: Landmarks) => measureBalletPose(lm, library).pose;
const ruleOf = (lm: Landmarks) => rulePose(balletFrame(lm)!);

/** Stand, hold `pose` for `holdFrames` frames (33 ms each), stand. Runs the detector like the app. */
function hold(pose: Landmarks, holdFrames = 45, before: Landmarks = standing()): ElementEvent[] {
  const events: ElementEvent[] = [];
  const detector = new BalletPoseDetector((e) => events.push(e));
  detector.library = library;
  for (const f of frames([...repeat(10, () => before), ...repeat(holdFrames, () => pose), ...repeat(10, () => before)])) detector.update(f);
  detector.flush();
  return events;
}

// ---------- The pose library ("training") ----------

test('default ballet library knows every pose with plenty of examples', () => {
  const counts = library.counts();
  for (const p of BALLET_LABELS) assert(counts[p] >= 100, `${p}: ${counts[p]}`);
  assert(balletLibraryReady(library));
});

test('ballet signature is the same facing left or right', () => {
  const a = balletSignature(balletFrame(balletArabesque({ facing: 1 }))!);
  const b = balletSignature(balletFrame(balletArabesque({ facing: -1 }))!);
  // 0.05: the test skeleton places the legs from the hip midpoint and widens the hips afterwards, so the
  // raised thigh is 83 px facing one way and 97 px the other (the same quirk as tests/library.test.ts).
  a.forEach((v, i) => assertClose(b[i], v, 0.05, `feature ${i}`));
});

test('library recognizes new, unseen examples of each pose', () => {
  assertEqual(poseOf(balletArabesque({ legDeg: 97, trunkTilt: 18, facing: -1, width: 0.22 })), 'arabesque');
  assertEqual(poseOf(balletAttitude({ thighDeg: 92, kneeDeg: 105 })), 'attitude');
  assertEqual(poseOf(balletDevant({ legDeg: 88, facing: -1 })), 'devant');
  assertEqual(poseOf(balletSeconde({ legDeg: 92, width: 0.72 })), 'seconde');
  assertEqual(poseOf(balletRetireSide({ thighDeg: 68 })), 'retire');
  assertEqual(poseOf(balletRetireFront({ width: 0.7 })), 'retire');
  assertEqual(poseOf(balletPlie({ leftKneeDeg: 95, rightKneeDeg: 97 })), 'plie');
});

test('library still recognizes faulty versions, so they can be judged', () => {
  assertEqual(poseOf(balletArabesque({ legDeg: 70 })), 'arabesque');
  assertEqual(poseOf(balletSeconde({ legDeg: 68 })), 'seconde');
  assertEqual(poseOf(balletRetireSide({ footDrop: 0.35 })), 'retire');
});

test('library rejects look-alikes: standing, tendu, coupé, penché', () => {
  for (const [name, lm] of <[string, Landmarks][]>[
    ['standing side', standing()],
    ['standing front', balletStandingFront()],
    ['tendu à la seconde', balletTenduSeconde()],
    ['tendu devant', balletDevant({ legDeg: 28 })],
    ['coupé', balletRetireSide({ thighDeg: 30, footDrop: 0.85 })],
    ['penché', balletArabesque({ legDeg: 170, trunkTilt: 85 })],
  ]) assertEqual(poseOf(lm), null, `${name}:`);
});

test('fixed rules (before the library is ready) agree on clean poses', () => {
  assertEqual(ruleOf(balletArabesque()), 'arabesque');
  assertEqual(ruleOf(balletAttitude()), 'attitude');
  assertEqual(ruleOf(balletDevant()), 'devant');
  assertEqual(ruleOf(balletSeconde()), 'seconde');
  assertEqual(ruleOf(balletRetireSide()), 'retire');
  assertEqual(ruleOf(balletPlie()), 'plie');
  assertEqual(ruleOf(balletStandingFront()), null);
});

test('teaching ballet poses adds to the ballet library only', () => {
  balletLibrary.resetTaught();
  const before = balletLibrary.libraryCounts().taught.arabesque;
  balletLibrary.teach('arabesque', [balletSignature(balletFrame(balletArabesque())!)]);
  assertEqual(balletLibrary.libraryCounts().taught.arabesque, before + 1);
  assertEqual(balletLibrary.currentLibrary().counts().arabesque, library.counts().arabesque + 1);
  balletLibrary.resetTaught();
});

// ---------- Held poses ----------

test('arabesque at 95°, straight legs, held 1.5 s: no points lost', () => {
  const [e, ...rest] = hold(balletArabesque({ legDeg: 95, trunkTilt: 10 }));
  assert(e && rest.length === 0, 'expected one move');
  assertEqual(e.code, 'BA.ARABESQUE');
  assertEqual(e.penalties.length, 0);
  assertEqual(e.dbValue, 0, 'held poses are technique only');
});

test('arabesque with the leg 15° low: −0.20 on the leg height', () => {
  const [e] = hold(balletArabesque({ legDeg: 75 }));
  assertEqual(e.penalties.length, 1);
  assertEqual(e.penalties[0].segment, 'legHeight');
  assertEqual(e.penalties[0].value, 0.2);
});

test('arabesque with a soft standing knee: −0.10', () => {
  const [e] = hold(balletArabesque({ supportKneeDeg: 150 }));
  assert(e.penalties.some((p) => p.segment === 'supportKnee' && p.value === 0.1), JSON.stringify(e.penalties));
});

test('arabesque may tilt forward 25°; more is a trunk deduction', () => {
  assertEqual(hold(balletArabesque({ trunkTilt: 24 }))[0].penalties.length, 0);
  const [e] = hold(balletArabesque({ trunkTilt: 38 }));
  assert(e.penalties.some((p) => p.segment === 'balletTrunk'), JSON.stringify(e.penalties));
});

test('arabesque held only 0.8 s: −0.20 for the short hold', () => {
  const [e] = hold(balletArabesque(), 25);
  assert(e.penalties.some((p) => p.segment === 'hold' && p.value === 0.2));
});

test('arabesque passed through in 0.5 s: a movement, not judged', () => {
  assertEqual(hold(balletArabesque(), 16).length, 0);
});

test('à la seconde from the front, leg at 70°: leg-height deduction', () => {
  const [e] = hold(balletSeconde({ legDeg: 70 }), 45, balletStandingFront());
  assertEqual(e.code, 'BA.SECONDE');
  assertEqual(e.penalties[0].segment, 'legHeight');
});

test('retiré with the foot 35% of a shin below the knee: −0.20', () => {
  const [e] = hold(balletRetireSide({ footDrop: 0.35 }));
  assertEqual(e.code, 'BA.RETIRE');
  const foot = e.penalties.find((p) => p.segment === 'retireFoot');
  assertEqual(foot?.value, 0.2);
});

test('grand plié, even knees: no points lost, no hold time needed', () => {
  const [e] = hold(balletPlie({ leftKneeDeg: 80, rightKneeDeg: 80 }), 30, balletStandingFront());
  assertEqual(e.code, 'BA.PLIE');
  assertEqual(e.element, 'Grand plié');
  assertEqual(e.penalties.length, 0);
});

test('demi-plié with uneven knees (20° apart): −0.10', () => {
  const [e] = hold(balletPlie({ leftKneeDeg: 130, rightKneeDeg: 110 }), 30, balletStandingFront());
  assertEqual(e.element, 'Demi-plié');
  assert(e.penalties.some((p) => p.segment === 'kneesUneven'));
});

test('a leg held up with the hand is a stretch, not a développé', () => {
  // The gymnastics front split with help: the hand holds the raised foot.
  assertEqual(hold(frontSplitBalance({ help: true, splitDeg: 175 })).length, 0);
});

test('à la seconde with the arm in second position above the leg is not mistaken for a held leg', () => {
  for (const legDeg of [60, 75, 90, 105, 115]) assertEqual(poseOf(balletSeconde({ legDeg })), 'seconde', `${legDeg}°:`);
});

test('a plié seen from the side is not judged (even knees can only be seen from the front)', () => {
  const sideways = balletPlie().map((p) => ({ ...p, x: 300 + (p.x - 300) * 0.15 })); // squeeze to side-on width
  assertEqual(measureBalletPose(sideways, library).pose, null);
});

test('a pose that turns while held is a turn, not a balance', () => {
  const events: ElementEvent[] = [];
  const poses = new BalletPoseDetector((e) => events.push(e));
  poses.library = null; // fixed rules: recognize the retiré from the front and the side alike
  const seq = [...repeat(10, () => balletStandingFront()), ...repeat(40, (i) => retireTurnPose((300 * i) / 39)), ...repeat(10, () => balletStandingFront())];
  for (const f of frames(seq)) poses.update(f); // no pirouette detector telling it she turns
  poses.flush();
  assertEqual(events.length, 0);
});

// ---------- Pirouettes ----------

function pirouette(turnDeg: number, n = 30, opts: Parameters<typeof retireTurnPose>[1] = {}): ElementEvent[] {
  const events: ElementEvent[] = [];
  const turns = new PirouetteDetector((e) => events.push(e));
  const poses = new BalletPoseDetector((e) => events.push(e));
  poses.library = library;
  const seq = [
    ...repeat(10, () => balletStandingFront()),
    ...repeat(n, (i) => retireTurnPose((turnDeg * i) / (n - 1), opts)),
    ...repeat(10, () => balletStandingFront()),
  ];
  for (const f of frames(seq)) {
    turns.update(f);
    poses.update({ ...f, turning: turns.live.turning });
  }
  turns.flush();
  poses.flush();
  return events;
}

test('single pirouette on demi-pointe: 0.10 difficulty, no points lost, not also a balance', () => {
  const events = pirouette(360);
  assertEqual(events.length, 1, 'one move:');
  const [e] = events;
  assertEqual(e.code, 'BA.PIROUETTE');
  assertEqual(e.measurements.rotations, 1);
  assertEqual(e.dbValue, 0.1);
  assertEqual(e.penalties.length, 0);
});

test('double pirouette: 0.20', () => {
  const [e] = pirouette(720, 50);
  assertEqual(e.element, 'Pirouette, 2 turns');
  assertEqual(e.dbValue, 0.2);
});

test('pirouette on a flat foot with the foot low: deductions', () => {
  const [e] = pirouette(360, 30, { releve: false, footDrop: 0.35 });
  assert(e.penalties.some((p) => p.segment === 'flatTurn'));
  assert(e.penalties.some((p) => p.segment === 'retireFoot'));
});

test('pirouette under one turn: −0.30, no difficulty', () => {
  const [e] = pirouette(250);
  assertEqual(e.dbValue, 0);
  assert(e.penalties.some((p) => p.segment === 'turnShort' && p.value === 0.3));
});

// ---------- Grand jeté ----------

function jete(splitDeg: number): ElementEvent[] {
  const events: ElementEvent[] = [];
  const detector = new GrandJeteDetector((e) => events.push(e));
  const seq = [...repeat(15, () => standing()), ...repeat(12, () => splitPose(splitDeg)), ...repeat(15, () => standing())];
  for (const f of frames(seq)) detector.update(f);
  return events;
}

test('grand jeté with a 180° split: 0.20, no points lost', () => {
  const [e] = jete(180);
  assertEqual(e.code, 'BA.GRAND-JETE');
  assertEqual(e.dbValue, 0.2);
  assertEqual(e.penalties.length, 0);
});

test('grand jeté 15° short: −0.20 with the ballet rubric (not the Code of Points)', () => {
  const [e] = jete(165);
  assertEqual(e.penalties[0].value, 0.2);
  assert(e.penalties[0].ref.startsWith('#B7'));
});

// ---------- Score, report and plain words ----------

test('ballet report quotes the rubric; poses are technique only', () => {
  const board = new Scoreboard();
  const pose = board.add(hold(balletArabesque({ legDeg: 75 }))[0]);
  board.add(jete(180)[0]);
  const report = buildReport(board, {}, { sport: 'ballet' });
  assertEqual(report.sport, 'ballet');
  assert(report.ruleSource.includes('ballet'), report.ruleSource);
  assertEqual(board.compute().status.get(pose.id), 'technique only');
  assertEqual(report.moves[0].deductions[0].rule?.source, 'Ballet rubric');
  assertEqual(report.summary.D, 0.2);
});

test('plain words for a ballet move', () => {
  const [e] = hold(balletArabesque({ legDeg: 75 }));
  const d = describeMove(e);
  assertEqual(d.name, 'Arabesque');
  assertEqual(d.reasons[0].text, 'The working leg was 15° below 90°.');
  assertEqual(mistakeLabel(e.penalties[0]), 'Leg 15° low  −0.20');
});

test('every ballet penalty ref has rubric text', () => {
  for (const ref of ['#B1', '#B2', '#B3', '#B4', '#B5', '#B6', '#B7', '#B8']) assert(balletRuleTextFor(ref), ref);
});
