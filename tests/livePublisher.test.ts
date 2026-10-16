import { test, assert, assertEqual } from './harness';
import { buildLiveState, LivePublisher, PUBLISH_EVERY_MS } from '../lib/competition/livePublisher';
import type { DbStatus } from '../lib/scoring';
import type { StoredEvent } from '../lib/types';
import type { LiveState } from '../lib/competition/types';

const event = (id: number, code: string, dbValue: number, penalties: number[] = [], extra: Partial<StoredEvent> = {}): StoredEvent => ({
  id, element: code, code, t: id * 1000, tStart: 0, tEnd: 1, dbValid: true, dbValue,
  penalties: penalties.map((value) => ({ reason: 'x', value, ref: '#2.5.3 p.25', segment: 'thigh', measuredDeg: 14 })),
  measurements: {}, confidence: 1, warnings: [], ruleRef: 'x', rejected: false, reviewed: false, ...extra,
});

test('judges get each AI move with its plain name, value and deductions', () => {
  const status = new Map<number, DbStatus>([[1, 'counted'], [2, 'repeat']]);
  const live = buildLiveState('p001', [event(1, '2.1202', 0.2, [0.3]), event(2, '2.1202', 0.2)], status, null, 1000, 5000);
  assertEqual(live.pid, 'p001');
  assertEqual(live.moves.length, 2);
  assertEqual(live.moves[0].name, 'Attitude');
  assert(live.moves[0].counts);
  assertEqual(live.moves[0].deductions[0].value, 0.3);
  assert(live.moves[0].deductions[0].text.includes('14°'), live.moves[0].deductions[0].text);
  assert(!live.moves[1].counts, 'a repeat does not count');
  assert(live.moves[1].note?.startsWith('Not counted again') ?? false);
  assertEqual(live.startedAt, 1000);
});

test('a shape too far off has no difficulty value; a move the organizer rejected is not sent', () => {
  const live = buildLiveState('p001', [event(1, '2.303', 0.3, [0.5], { dbValid: false }), event(2, '2.303', 0.3, [], { rejected: true })], new Map(), null, null, 0);
  assertEqual(live.moves.length, 1);
  assertEqual(live.moves[0].dbValue, 0);
});

test('the pose being held is sent; "Watching…" is not', () => {
  assertEqual(buildLiveState('p', [], new Map(), { pose: 'Attitude', showDots: true, text: 'Looks good' }, null, 0).now?.pose, 'Attitude');
  assertEqual(buildLiveState('p', [], new Map(), { pose: 'Watching', showDots: false, text: 'Ready' }, null, 0).now, null);
  // The held balance's estimate goes along; without one it is null (Firestore refuses undefined).
  const held = buildLiveState('p', [], new Map(), { pose: 'Attitude', showDots: true, text: '', estimate: { dbValue: 0.3, deduction: 0.1 } }, null, 0).now;
  assertEqual(held?.dbValue, 0.3);
  assertEqual(held?.deduction, 0.1);
  const none = buildLiveState('p', [], new Map(), { pose: 'Attitude', showDots: true, text: '' }, null, 0).now;
  assertEqual(none?.dbValue, null);
  assertEqual(none?.deduction, null);
});

/** A fake clock and timer queue. */
function fakeTime() {
  let now = 0;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let next = 1;
  return {
    clock: () => now,
    schedule: (fn: () => void, ms: number) => { const id = next++; timers.push({ at: now + ms, fn, id }); return id as unknown as ReturnType<typeof setTimeout>; },
    cancel: (id: ReturnType<typeof setTimeout>) => { timers = timers.filter((t) => t.id !== (id as unknown as number)); },
    advance(ms: number) {
      now += ms;
      for (const t of timers.filter((x) => x.at <= now)) { timers = timers.filter((x) => x !== t); t.fn(); }
    },
  };
}
const state = (n: number): LiveState => ({ pid: 'p', moves: [], now: { pose: `pose ${n}`, text: '' }, startedAt: null, updatedAt: n });

test('at most one write every 500 ms, and the last change is always sent', () => {
  const t = fakeTime();
  const sent: string[] = [];
  const pub = new LivePublisher((l) => sent.push(l.now!.pose), t.clock, t.schedule, t.cancel);
  pub.update(state(1)); // sent at once
  t.advance(100); pub.update(state(2));
  t.advance(100); pub.update(state(3)); // 2 is replaced by 3 before it goes out
  assertEqual(sent.join(), 'pose 1');
  t.advance(PUBLISH_EVERY_MS);
  assertEqual(sent.join(), 'pose 1,pose 3');
});

test('nothing is sent when nothing changed; flush sends at once; stop drops what waits', () => {
  const t = fakeTime();
  const sent: number[] = [];
  const pub = new LivePublisher((l) => sent.push(l.updatedAt), t.clock, t.schedule, t.cancel);
  pub.update(state(1));
  t.advance(600);
  pub.update({ ...state(1), updatedAt: 99 }); // same moves and pose: no write
  assertEqual(sent.length, 1);
  pub.update(state(2)); // more than 500 ms later: at once
  t.advance(10); pub.update(state(3));
  pub.flush();
  assertEqual(sent.join(), '1,2,3');
  t.advance(10); pub.update(state(4));
  pub.stop();
  t.advance(1000);
  assertEqual(sent.join(), '1,2,3');
});
