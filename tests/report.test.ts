import { test, assert, assertEqual } from './harness';
import { buildReport } from '../lib/report';
import { Scoreboard } from '../lib/scoring';
import { BalanceDetector } from '../lib/elements/balances';
import type { ElementEvent } from '../lib/types';
import { standing, frontSplitBalance, attitudeBalance, frames, repeat } from '../lib/library/examples/poses';

/** One routine: clean front split, attitude with 2 faults, short repeat of the front split. */
function routine() {
  const events: ElementEvent[] = [];
  const d = new BalanceDetector((e) => events.push(e));
  d.library = null; // rules only: keeps this test about the report
  const seq = [
    ...repeat(15, () => standing()),
    ...repeat(40, () => frontSplitBalance({ help: true })),
    ...repeat(15, () => standing()),
    ...repeat(40, () => attitudeBalance({ thighDeg: 84, trunkTilt: 15 })),
    ...repeat(15, () => standing()),
    ...repeat(19, () => frontSplitBalance({ help: true })),
    ...repeat(15, () => standing()),
  ];
  for (const f of frames(seq)) d.update(f);
  const sb = new Scoreboard();
  for (const e of events) sb.add({ ...e, routineMs: e.t });
  return sb;
}

test('report lists every move in order with its deductions', () => {
  const r = buildReport(routine(), { artistry: 8 });
  assertEqual(r.moves.length, 3);
  assertEqual(r.moves.map((m) => m.code).join(','), '2.303,2.1202,2.303');
  assert(r.moves[0].clean, 'first front split is clean');
  assertEqual(r.moves[1].totalDeduction, 0.4); // thigh small 0.10 + trunk medium 0.30
  assertEqual(r.moves[2].status, 'repeat');
});

test('every deduction carries the rulebook sentence and page', () => {
  const r = buildReport(routine());
  const all = r.moves.flatMap((m) => m.deductions);
  assert(all.length >= 3);
  for (const d of all) assert(d.rule && d.rule.text.length > 40 && d.rule.page > 0, `no rule text for ${d.ref}`);
  const hold = all.find((d) => d.ref.includes('10.2.2'));
  assert(hold?.rule?.text.includes('less than 1 second'));
});

test('report totals match the scoreboard', () => {
  const sb = routine();
  const r = buildReport(sb, { artistry: 8, penalties: 0.3 });
  // 0.40 (attitude) + 0.30 (short hold on the repeat) + its split deviation (0 here)
  assertEqual(r.summary.totalDeduction, 0.7);
  assertEqual(r.summary.D, 0.5); // front split 0.30 + attitude 0.20, repeat not counted
  assertEqual(r.summary.E, 9.3);
  assertEqual(r.summary.final, round(0.5 + 8 + 9.3 - 0.3));
  assertEqual(r.summary.cleanMoves, 1);
});

test('a move the judge rejects has no deductions in the report', () => {
  const sb = routine();
  sb.setRejected(sb.events[1].id, true);
  const r = buildReport(sb);
  assert(r.moves[1].rejected && r.moves[1].deductions.length === 0);
  assertEqual(r.summary.totalDeduction, 0.3);
});

test('the report counts moves no judge has checked yet', () => {
  const sb = routine();
  const total = sb.events.length;
  assertEqual(buildReport(sb).summary.notReviewed, total);
  sb.setRejected(sb.events[0].id, false);
  sb.setRejected(sb.events[1].id, true);
  const r = buildReport(sb);
  assertEqual(r.summary.notReviewed, total - 2);
  assert(r.moves[0].reviewed && r.moves[1].reviewed);
});

test('requirement text from the rulebook is included for each move', () => {
  const r = buildReport(routine());
  assert(r.moves[1].requirement?.includes('Horizontal position of the free leg'));
  assert(r.moves[0].requirement?.includes('Split is required'));
});

function round(x: number) {
  return Math.round(x * 100) / 100;
}
