import { test, assert, assertEqual } from './harness';
import { Scoreboard } from '../lib/scoring';
import type { ElementEvent } from '../lib/types';

let t = 0;
const ev = (code: string, dbValue: number, penalties: number[] = [], dbValid = true): ElementEvent => ({
  element: code, code, t: (t += 1000), tStart: t, tEnd: t, dbValid, dbValue,
  penalties: penalties.map((value) => ({ reason: 'test', value, ref: 'test', segment: 'test' })),
  measurements: {}, confidence: 1, warnings: [], ruleRef: 'test',
});

test('final = D + A + E - penalties', () => {
  const sb = new Scoreboard();
  sb.add(ev('1.2103', 0.3, [0.1]));
  sb.add(ev('2.101', 0.1));
  const r = sb.compute({ artistry: 7.5, penalties: 0.3 });
  assertEqual(r.D, 0.4);
  assertEqual(r.E, 9.9);
  assertEqual(r.A, 7.5);
  assertEqual(r.final, 17.5);
});

test('repeated difficulty counts once, but its E faults still count', () => {
  const sb = new Scoreboard();
  const first = sb.add(ev('1.2103', 0.3));
  const second = sb.add(ev('1.2103', 0.3, [0.3]));
  const r = sb.compute();
  assertEqual(r.D, 0.3);
  assertEqual(r.E, 9.7);
  assertEqual(r.status.get(first.id), 'counted');
  assertEqual(r.status.get(second.id), 'repeat');
});

test('only the highest 8 DB count', () => {
  const sb = new Scoreboard();
  for (let i = 1; i <= 10; i++) sb.add(ev(`X.${i}`, i / 10));
  const r = sb.compute();
  // 0.3 + 0.4 + ... + 1.0 = 5.2
  assertEqual(r.D, 5.2);
  assertEqual([...r.status.values()].filter((s) => s === 'not in top 8').length, 2);
});

test('judge rejects an event: it gives no D and no E penalty', () => {
  const sb = new Scoreboard();
  const e = sb.add(ev('1.2103', 0.3, [0.5]));
  sb.setRejected(e.id, true);
  const r = sb.compute();
  assertEqual(r.D, 0);
  assertEqual(r.E, 10);
  assertEqual(r.status.get(e.id), 'rejected');
});

test('invalid DB adds nothing to D but keeps its E penalty', () => {
  const sb = new Scoreboard();
  sb.add(ev('1.2103', 0, [0.5], false));
  const r = sb.compute();
  assertEqual(r.D, 0);
  assertEqual(r.E, 9.5);
});

test('judge extras: manual D and E, artistry clamped to 0-10', () => {
  const sb = new Scoreboard();
  const r = sb.compute({ artistry: 14, extraD: 2.4, extraE: 1.2 });
  assertEqual(r.A, 10);
  assertEqual(r.D, 2.4);
  assertEqual(r.E, 8.8);
});

test('E never goes below 0', () => {
  const sb = new Scoreboard();
  for (let i = 0; i < 30; i++) sb.add(ev(`Y.${i}`, 0, [0.5], false));
  assertEqual(sb.compute().E, 0);
});

test('audit export lists every event with its DB status', () => {
  const sb = new Scoreboard();
  sb.add(ev('1.2103', 0.3));
  const audit = sb.toAudit({ artistry: 8 }, { source: 'test' });
  assertEqual(audit.events[0].dbStatus, 'counted');
  assertEqual(audit.scores.final, 18.3);
  assert(audit.exportedAt);
});
