import { test, assert, assertEqual } from './harness';
import { BalanceDetector, liveEstimate, measureBalance, SHAPES } from '../lib/elements/balances';
import { Scoreboard } from '../lib/scoring';
import type { ElementEvent } from '../lib/types';
import type { Landmarks } from '../lib/geometry';
import {
  standing, passePose, splitPose, frontSplitBalance, backSplitBalance, arabesqueBalance,
  attitudeBalance, frames, repeat,
} from '../lib/library/examples/poses';

function run(seq: (Landmarks | null)[], opts: { airborne?: boolean } = {}) {
  const events: ElementEvent[] = [];
  const d = new BalanceDetector((e) => events.push(e));
  for (const f of frames(seq)) d.update({ ...f, airborne: opts.airborne ?? false });
  d.flush();
  return events;
}

/** Stand, hold `make()` for n frames (~33 ms each), stand. 40 frames ≈ 1.3 s. */
const hold = (n: number, make: (i: number) => Landmarks) => [...repeat(10, () => standing()), ...repeat(n, make), ...repeat(10, () => standing())];
const only = (events: ElementEvent[]) => {
  assertEqual(events.length, 1, 'number of events:');
  return events[0];
};
const penaltyValues = (e: ElementEvent) => e.penalties.map((p) => p.value).sort();

// ---------- Front split ----------

test('front split 180° with help, 1.3 s on relevé: 2.303, DB 0.30, no penalty', () => {
  const e = only(run(hold(40, () => frontSplitBalance({ help: true }))));
  assertEqual(e.code, '2.303');
  assert(e.dbValid && e.dbValue === 0.3);
  assertEqual(e.penalties.length, 0);
});

test('front split without help is the 2.305 variant (0.50)', () => {
  const e = only(run(hold(40, () => frontSplitBalance({ help: false }))));
  assertEqual(e.code, '2.305');
  assertEqual(e.dbValue, 0.5);
});

test('front split 172°: small deviation, E -0.10, valid', () => {
  const e = only(run(hold(40, () => frontSplitBalance({ splitDeg: 172, help: true }))));
  assert(e.dbValid);
  assertEqual(e.measurements.splitDevDeg, 8);
  assertEqual(e.penalties[0].value, 0.1);
});

test('front split 165°: medium deviation, E -0.30, valid', () => {
  const e = only(run(hold(40, () => frontSplitBalance({ splitDeg: 165, help: true }))));
  assert(e.dbValid);
  assertEqual(e.penalties[0].value, 0.3);
});

test('front split 150°: large deviation, E -0.50, DB NOT valid', () => {
  const e = only(run(hold(40, () => frontSplitBalance({ splitDeg: 150, help: true }))));
  assert(!e.dbValid && e.dbValue === 0);
  assertEqual(e.penalties[0].value, 0.5);
});

test('front split facing left is recognized the same way', () => {
  const e = only(run(hold(40, () => frontSplitBalance({ help: true, facing: -1 }))));
  assertEqual(e.code, '2.303');
});

test('front split held 0.6 s: valid, E -0.30 "not held 1 second"', () => {
  const e = only(run(hold(19, () => frontSplitBalance({ help: true }))));
  assert(e.dbValid);
  assert(e.penalties.some((p) => p.value === 0.3 && p.reason.includes('1 second')));
});

test('front split on flat foot: value 0.30 - 0.10 = 0.20', () => {
  const e = only(run(hold(40, () => frontSplitBalance({ help: true, releve: false }))));
  assertEqual(e.dbValue, 0.2);
  assert(e.warnings.some((w) => w.includes('flat foot')));
});

test('a kick through the split (no stop) is not a balance', () => {
  assertEqual(run(hold(6, () => frontSplitBalance({ help: true }))).length, 0);
});

// ---------- Back split without help (whole foot above head) ----------

test('back split, leg 170°, no help: 2.1005, DB 0.50, whole foot above head', () => {
  const e = only(run(hold(40, () => backSplitBalance({ legDeg: 170 }))));
  assertEqual(e.code, '2.1005');
  assert(e.dbValid && e.dbValue === 0.5);
  assertEqual(e.measurements.footDevDeg, 0);
  assertEqual(e.penalties.length, 0);
});

test('back split, foot a little below head: deduction, still valid', () => {
  // Trunk leans 20° forward (builder default), so a 140° leg leaves the foot 10° short.
  const e = only(run(hold(40, () => backSplitBalance({ legDeg: 140 }))));
  assert(e.dbValid, 'should be valid');
  assertEqual(e.measurements.footDevDeg, 10);
  assertEqual(e.penalties[0].value, 0.1);
  assert(e.penalties[0].reason.includes('Foot not fully above head'));
});

test('back split, foot far below head: large deviation, DB NOT valid', () => {
  const e = only(run(hold(40, () => backSplitBalance({ legDeg: 125 }))));
  assert(e.measurements.footDevDeg! > 20);
  assert(!e.dbValid);
});

test('back split with a hand on the leg is out of scope: not scored', () => {
  // In 2D it looks like a front split with the trunk bent back, so we don't guess.
  assertEqual(run(hold(40, () => backSplitBalance({ legDeg: 176, help: true }))).length, 0);
});

test('backward bent leg held by the hand (ring-like) is not an attitude', () => {
  assertEqual(run(hold(40, () => attitudeBalance({ help: true }))).length, 0);
});

test('arabesque (leg only horizontal) is not a back split', () => {
  assertEqual(only(run(hold(40, () => arabesqueBalance()))).code, '2.902');
});

// ---------- Back split, trunk forward (row 11; the team's video) ----------

test('back split with the trunk below horizontal, split 180°: 2.1104, DB 0.40, clean', () => {
  const e = only(run(hold(40, () => backSplitBalance({ legDeg: 180, trunkTilt: 108 }))));
  assertEqual(e.code, '2.1104');
  assert(e.dbValid && e.dbValue === 0.4);
  assertEqual(e.penalties.length, 0);
});

test('back split trunk forward, split 165°: medium split deviation', () => {
  const e = only(run(hold(40, () => backSplitBalance({ legDeg: 165, trunkTilt: 100 }))));
  assertEqual(e.code, '2.1104');
  assertEqual(e.penalties[0].value, 0.3);
});

test('back split trunk forward but trunk 15° above horizontal: trunk deviation', () => {
  const e = only(run(hold(40, () => backSplitBalance({ legDeg: 180, trunkTilt: 75 }))));
  assertEqual(e.code, '2.1104');
  assert(e.penalties.some((p) => p.reason.startsWith('Trunk above horizontal')));
});

// ---------- Attitude ----------

test('attitude, thigh horizontal, trunk upright: 2.1202, DB 0.20, no penalty', () => {
  const e = only(run(hold(40, () => attitudeBalance())));
  assertEqual(e.code, '2.1202');
  assert(e.dbValid && e.dbValue === 0.2);
  assertEqual(e.penalties.length, 0);
});

test('attitude, thigh 15° below horizontal: medium deviation, E -0.30', () => {
  const e = only(run(hold(40, () => attitudeBalance({ thighDeg: 75 }))));
  assertEqual(e.measurements.thighDevDeg, 15);
  assertEqual(e.penalties.length, 1);
  assertEqual(e.penalties[0].value, 0.3);
});

test('attitude with small thigh and medium trunk deviation: 0.10 + 0.30 (CoP p. 83 example)', () => {
  const e = only(run(hold(40, () => attitudeBalance({ thighDeg: 84, trunkTilt: 35 }))));
  assert(e.dbValid);
  assertEqual(JSON.stringify(penaltyValues(e)), JSON.stringify([0.1, 0.3]));
});

test('attitude with trunk leaning 45° (25° past the natural 20°): large trunk deviation, DB NOT valid', () => {
  const e = only(run(hold(40, () => attitudeBalance({ trunkTilt: 45 }))));
  assert(!e.dbValid);
});

test('attitude facing left is recognized', () => {
  assertEqual(only(run(hold(40, () => attitudeBalance({ facing: -1 })))).code, '2.1202');
});

// ---------- Arabesque (row 9; the team's video, 2026-10-13) ----------

test('arabesque, thigh horizontal, trunk upright: 2.902, DB 0.20, no penalty', () => {
  const e = only(run(hold(40, () => arabesqueBalance({ legDeg: 92 }))));
  assertEqual(e.code, '2.902');
  assert(e.dbValid && e.dbValue === 0.2);
  assertEqual(e.penalties.length, 0);
});

test('arabesque, leg 16° below horizontal: medium thigh deviation (13° after the margin), E -0.30', () => {
  const e = only(run(hold(40, () => arabesqueBalance({ legDeg: 74 }))));
  assertEqual(e.code, '2.902');
  assertEqual(JSON.stringify(penaltyValues(e)), JSON.stringify([0.3]));
});

test('arabesque with the trunk leaning 35° (15° past the natural 20°): medium trunk deviation, valid', () => {
  const e = only(run(hold(40, () => arabesqueBalance({ trunkTilt: 35, facing: -1 }))));
  assert(e.dbValid);
  assertEqual(JSON.stringify(penaltyValues(e)), JSON.stringify([0.3]));
});

test('arabesque with a natural 18° lean: no trunk deduction (team decision, rules.ts)', () => {
  const e = only(run(hold(40, () => arabesqueBalance({ legDeg: 92, trunkTilt: 18 }))));
  assert(e.dbValid);
  assertEqual(e.penalties.length, 0);
});

test('arabesque with the trunk forward at the horizontal (2.903) is not scored', () => {
  assertEqual(run(hold(40, () => arabesqueBalance({ trunkTilt: 85 }))).length, 0);
});

test('leg passing arabesque height on its way up to a back split: one move, the back split', () => {
  const seq = [
    ...repeat(10, () => standing()),
    ...repeat(15, () => arabesqueBalance()), // 0.5 s on the way up
    ...repeat(40, () => backSplitBalance({ legDeg: 180, trunkTilt: 108 })),
    ...repeat(10, () => standing()),
  ];
  assertEqual(only(run(seq)).code, '2.1104');
});

test('a balance that ends by leaving the camera view is still judged', () => {
  const seq = [...repeat(40, () => frontSplitBalance({ help: true })), ...repeat(15, () => null)]; // > 0.4 s gap
  const events: ElementEvent[] = [];
  const d = new BalanceDetector((e) => events.push(e));
  for (const f of frames(seq)) d.update(f); // no flush: the null frames must close it
  assertEqual(events.length, 1);
});

// ---------- Fair judging: no extra deductions from tracking noise ----------

test('hand flickering on and off the leg during one hold = ONE move, no repeat or short-hold penalty', () => {
  const e = only(run(hold(45, (i) => frontSplitBalance({ help: i % 3 !== 0 })))); // help 2 of 3 frames
  assertEqual(e.code, '2.303'); // majority: with help
  assertEqual(e.penalties.length, 0);
});

test('one misrecognized frame in the middle of a hold does not split it', () => {
  const e = only(run(hold(45, (i) => (i === 20 ? attitudeBalance() : frontSplitBalance({ help: true })))));
  assertEqual(e.code, '2.303');
  assertEqual(e.penalties.length, 0);
});

test('going straight from one balance into another keeps the full hold time of the second', () => {
  const seq = [...repeat(10, () => standing()), ...repeat(40, () => frontSplitBalance({ help: true })),
    ...repeat(40, () => attitudeBalance()), ...repeat(10, () => standing())];
  const events = run(seq);
  assertEqual(events.length, 2, 'number of events:');
  const attitude = events[1];
  assertEqual(attitude.code, '2.1202');
  assert(attitude.measurements.holdMs! > 1200, `held ${attitude.measurements.holdMs} ms`);
  assertEqual(attitude.penalties.length, 0); // no "held < 1 s" penalty
});

test('a short tracking dropout (0.3 s) does not split a hold', () => {
  const seq = [...repeat(10, () => standing()),
    ...repeat(20, () => frontSplitBalance({ help: true })), ...repeat(9, () => null),
    ...repeat(20, () => frontSplitBalance({ help: true })), ...repeat(15, () => standing())];
  const e = only(run(seq));
  assert(e.measurements.holdMs! > 1400, `held ${e.measurements.holdMs} ms`);
  assertEqual(e.penalties.length, 0);
});

test('camera margin: a split 2-3° short of 180° is not deducted', () => {
  assertEqual(only(run(hold(40, () => frontSplitBalance({ help: true, splitDeg: 177 })))).penalties.length, 0);
  // 4° measured -> 1° after the margin -> small deviation
  assertEqual(only(run(hold(40, () => frontSplitBalance({ help: true, splitDeg: 176 })))).penalties[0].value, 0.1);
});

// ---------- No false positives ----------

test('standing, passé and split leap frames give no balance events', () => {
  assertEqual(run(repeat(60, () => standing())).length, 0);
  assertEqual(run(hold(40, () => passePose())).length, 0);
  assertEqual(run(repeat(30, () => splitPose(180)), { airborne: true }).length, 0);
});

test('measureBalance names the live shape for the readout', () => {
  assertEqual(measureBalance(frontSplitBalance({ help: true })).shape, 'frontSplitHelp');
  assertEqual(measureBalance(backSplitBalance()).shape, 'backSplitFootAboveHead');
  assertEqual(measureBalance(attitudeBalance({ trunkTilt: 70 })).shape, null);
  assertEqual(measureBalance(attitudeBalance()).shape, 'attitude');
  assertEqual(measureBalance(standing()).shape, null);
});

// ---------- Scoring ----------

test('front split with and without help are the same box: second one is a repeat', () => {
  const sb = new Scoreboard();
  const events = [
    ...run(hold(40, () => frontSplitBalance({ help: true }))),
    ...run(hold(40, () => frontSplitBalance({ help: false }))),
  ];
  events[1].t += 10000; // later in the routine
  const [a, b] = events.map((e) => sb.add(e));
  const r = sb.compute();
  assertEqual(r.status.get(a.id), 'counted');
  assertEqual(r.status.get(b.id), 'repeat');
  assertEqual(r.D, 0.3);
});

test('live estimate while a balance is held: its value and this frame\'s deductions', () => {
  const value = SHAPES.attitude.variant.value;
  const base = { shape: 'attitude' as const, label: 'Attitude', mainDeg: null, holdMs: 500, deduction: null, hint: null };
  // 8° off is 5° after the 3° camera margin: small (−0.10), still counts.
  const small = liveEstimate({ ...base, deviations: [{ segment: 'thigh', label: 'Thigh', deg: 8 }] });
  assertEqual(small?.dbValue, value);
  assertEqual(small?.deduction, 0.1);
  // 30° off: large (−0.50), too far off to count as a difficulty.
  const large = liveEstimate({ ...base, deviations: [{ segment: 'thigh', label: 'Thigh', deg: 30 }] });
  assertEqual(large?.dbValue, 0);
  assertEqual(large?.deduction, 0.5);
  assertEqual(liveEstimate({ ...base, shape: null }), null);
});
