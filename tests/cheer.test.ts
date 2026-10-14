import { test, assert, assertEqual } from './harness';
import { MotionDetector } from '../lib/cheer/motions';
import { CheerJumpDetector } from '../lib/cheer/jumps';
import { cheerBand, cheerRuleTextFor } from '../lib/cheer/rules';
import { Scoreboard } from '../lib/scoring';
import { buildReport } from '../lib/report';
import { describeMove, mistakeLabel } from '../lib/ui/plain';
import { frames, repeat } from '../lib/library/examples/poses';
import type { ElementEvent } from '../lib/types';
import { cheerPose, type CheerPose } from './cheerPoses';

/** Stand, hold the arms in `pose` for `holdFrames` frames (33 ms each), stand again. */
function motion(pose: CheerPose, holdFrames = 20): ElementEvent[] {
  const events: ElementEvent[] = [];
  const detector = new MotionDetector((e) => events.push(e));
  const seq = [...repeat(10, () => cheerPose()), ...repeat(holdFrames, () => cheerPose(pose)), ...repeat(10, () => cheerPose())];
  for (const f of frames(seq)) detector.update(f);
  detector.flush();
  return events;
}

/** Stand, jump in `pose` (lifted 40 px), land. */
function jump(pose: CheerPose, flightFrames = 12): ElementEvent[] {
  const events: ElementEvent[] = [];
  const detector = new CheerJumpDetector((e) => events.push(e));
  const ground = { side: pose.side };
  const seq = [
    ...repeat(15, () => cheerPose(ground)),
    ...repeat(flightFrames, () => cheerPose({ ...pose, rise: 40 })),
    ...repeat(15, () => cheerPose(ground)),
  ];
  for (const f of frames(seq)) detector.update(f);
  return events;
}

const points = (e: ElementEvent) => Math.round(e.penalties.reduce((s, p) => s + p.value, 0) * 100) / 100;

// ---------- Motions ----------

test('High V on target: one motion, no points lost', () => {
  const [e, ...rest] = motion({ leftArm: 135, rightArm: 135 });
  assert(e && rest.length === 0, 'expected exactly one event');
  assertEqual(e.code, 'CH.HIGH-V');
  assertEqual(e.penalties.length, 0);
  assertEqual(e.dbValue, 0, 'motions have no difficulty value');
});

test('T, Low V and touchdown are recognized', () => {
  assertEqual(motion({ leftArm: 90, rightArm: 90 })[0]?.code, 'CH.T');
  assertEqual(motion({ leftArm: 45, rightArm: 45 })[0]?.code, 'CH.LOW-V');
  assertEqual(motion({ leftArm: 178, rightArm: 178 })[0]?.code, 'CH.TOUCHDOWN');
});

test('one-sided motions work with either arm', () => {
  assertEqual(motion({ leftArm: 135, rightArm: 45 })[0]?.code, 'CH.DIAGONAL');
  assertEqual(motion({ leftArm: 45, rightArm: 135 })[0]?.code, 'CH.DIAGONAL');
  assertEqual(motion({ leftArm: 180, rightArm: 90 })[0]?.code, 'CH.L-MOTION');
  assertEqual(motion({ leftArm: 90, rightArm: 180 })[0]?.code, 'CH.L-MOTION');
  assertEqual(motion({ leftArm: 180, rightArm: 'hip' })[0]?.code, 'CH.PUNCH');
});

test('broken T: upper arms level, elbows bent', () => {
  const [e] = motion({ leftArm: { upperDeg: 90, elbowDeg: 45 }, rightArm: { upperDeg: 90, elbowDeg: 45 } });
  assertEqual(e?.code, 'CH.BROKEN-T');
  assertEqual(e.penalties.length, 0, 'bent elbows are part of a broken T');
});

test('T with one arm 15° low: medium placement deduction on that arm only', () => {
  const [e] = motion({ leftArm: 75, rightArm: 90 });
  assertEqual(e.code, 'CH.T');
  assertEqual(e.penalties.length, 1);
  assertEqual(e.penalties[0].segment, 'leftArmLow');
  assertEqual(e.penalties[0].value, 0.2); // 15° - 3° margin = 12° -> medium
});

test('High V with bent arms: −0.10 per bent arm', () => {
  const [e] = motion({ leftArm: { upperDeg: 135, elbowDeg: 140 }, rightArm: { upperDeg: 135, elbowDeg: 140 } });
  assertEqual(e?.code, 'CH.HIGH-V');
  const bent = e.penalties.filter((p) => p.segment.endsWith('Elbow'));
  assertEqual(bent.length, 2);
});

test('arms down (standing) is not a motion', () => {
  assertEqual(motion({ leftArm: 5, rightArm: 5 }).length, 0);
});

test('a motion passed through quickly (under 0.3 s) is not judged', () => {
  assertEqual(motion({ leftArm: 90, rightArm: 90 }, 5).length, 0);
});

test('side-on to the camera: motions are not judged', () => {
  const events: ElementEvent[] = [];
  const detector = new MotionDetector((e) => events.push(e));
  for (const f of frames(repeat(20, () => cheerPose({ leftArm: 90, rightArm: 90, side: true })))) detector.update(f);
  detector.flush();
  assertEqual(events.length, 0);
});

// ---------- Jumps ----------

test('toe touch: legs level, arms in a T: difficulty, no points lost', () => {
  const [e, ...rest] = jump({ leftLeg: 95, rightLeg: 95, leftArm: 90, rightArm: 90 });
  assert(e && rest.length === 0, 'expected exactly one event');
  assertEqual(e.code, 'CH.TOE-TOUCH');
  assertEqual(e.penalties.length, 0);
  assert(e.dbValid && e.dbValue === 0.3, 'toe touch earns 0.30');
});

test('toe touch with legs 15° low: −0.20, still credited', () => {
  const [e] = jump({ leftLeg: 75, rightLeg: 80, leftArm: 90, rightArm: 90 });
  assertEqual(e.code, 'CH.TOE-TOUCH');
  assertEqual(points(e), 0.2);
  assertEqual(e.penalties[0].segment, 'jumpLegs');
  assert(e.dbValid);
});

test('toe touch with legs far too low (60°): −0.30, no difficulty', () => {
  const [e] = jump({ leftLeg: 60, rightLeg: 60, leftArm: 90, rightArm: 90 });
  assertEqual(e.code, 'CH.TOE-TOUCH');
  assert(!e.dbValid && e.dbValue === 0);
});

test('toe touch with arms in a High V instead of a T: arm deduction', () => {
  const [e] = jump({ leftLeg: 95, rightLeg: 95, leftArm: 135, rightArm: 135 });
  assert(e.penalties.some((p) => p.segment === 'jumpArms'));
});

test('spread eagle: legs apart in an X, arms High V', () => {
  const [e] = jump({ leftLeg: 35, rightLeg: 35, leftArm: 135, rightArm: 135 });
  assertEqual(e?.code, 'CH.SPREAD-EAGLE');
  assertEqual(e.penalties.length, 0);
});

test('herkie: one straight leg out, the other bent underneath', () => {
  const [e] = jump({ leftLeg: 95, rightLeg: 20, rightKnee: 80 });
  assertEqual(e?.code, 'CH.HERKIE');
  assertEqual(e.penalties.length, 0);
});

test('pike from the side: both legs forward, level', () => {
  const [e] = jump({ leftLeg: 92, rightLeg: 92, side: true });
  assertEqual(e?.code, 'CH.PIKE');
  assertEqual(e.penalties.length, 0);
  assertEqual(e.warnings.filter((w) => w.includes('unreliable')).length, 0);
});

test('tuck from the side: knees up', () => {
  const [e] = jump({ leftLeg: 100, rightLeg: 100, leftKnee: 60, rightKnee: 60, side: true });
  assertEqual(e?.code, 'CH.TUCK');
  assertEqual(e.penalties.length, 0);
});

test('straight jump (legs down) is not judged', () => {
  assertEqual(jump({}).length, 0);
});

test('a jump does not count as an arm motion', () => {
  const events: ElementEvent[] = [];
  const jumps = new CheerJumpDetector(() => {});
  const motions = new MotionDetector((e) => events.push(e));
  const seq = [
    ...repeat(15, () => cheerPose()),
    ...repeat(14, () => cheerPose({ leftLeg: 95, rightLeg: 95, leftArm: 90, rightArm: 90, rise: 40 })),
    ...repeat(15, () => cheerPose()),
  ];
  for (const f of frames(seq)) {
    jumps.update(f);
    motions.update({ ...f, airborne: jumps.live.airborne });
  }
  motions.flush();
  assertEqual(events.length, 0);
});

// ---------- Rubric ----------

test('cheer bands: 3° margin, then 0.10 / 0.20 / 0.30', () => {
  assertEqual(cheerBand(3).penalty, 0);
  assertEqual(cheerBand(13).penalty, 0.1);
  assertEqual(cheerBand(23).penalty, 0.2);
  assertEqual(cheerBand(24).penalty, 0.3);
  assert(!cheerBand(24).creditsDifficulty);
});

test('every cheer penalty ref has rubric text', () => {
  for (const ref of ['#C1 Cheer rubric', '#C2', '#C3', '#C4', '#C5', '#C6']) assert(cheerRuleTextFor(ref), ref);
});

// ---------- Score, report and plain words ----------

test('a motion is judged on technique only; a jump earns difficulty', () => {
  const board = new Scoreboard();
  const m = board.add(motion({ leftArm: 75, rightArm: 90 })[0]); // T, left arm low: −0.20
  const j = board.add(jump({ leftLeg: 95, rightLeg: 95, leftArm: 90, rightArm: 90 })[0]); // toe touch 0.30
  const r = board.compute({ artistry: 8 });
  assertEqual(r.status.get(m.id), 'technique only');
  assertEqual(r.status.get(j.id), 'counted');
  assertEqual(r.D, 0.3);
  assertEqual(r.E, 9.8);
  assertEqual(r.final, 18.1);
});

test('cheer report: rubric source and quoted rubric text, no Code of Points', () => {
  const board = new Scoreboard();
  board.add(motion({ leftArm: 75, rightArm: 90 })[0]);
  const report = buildReport(board, {}, { sport: 'cheer' });
  assertEqual(report.sport, 'cheer');
  assert(report.ruleSource.includes('rubric'), report.ruleSource);
  assertEqual(report.moves[0].deductions[0].rule?.source, 'Cheer rubric');
  assert(!report.moves[0].statusText.includes('#'), 'no Code of Points sections in cheer');
});

test('plain words for a cheer move', () => {
  const [e] = motion({ leftArm: 75, rightArm: 90 });
  const d = describeMove(e);
  assertEqual(d.name, 'T motion');
  assertEqual(d.result, '0.20 points lost');
  assertEqual(d.reasons[0].text, 'The left arm was 15° too low.');
  assertEqual(mistakeLabel(e.penalties[0]), 'Left arm 15° low  −0.20');
});
