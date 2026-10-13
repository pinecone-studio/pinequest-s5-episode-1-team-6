import { test, assert, assertEqual } from './harness';
import { describeMove, explainPenalty, liveMessage, modelDownloadText, plainHint } from '../lib/ui/plain';
import { BalanceDetector } from '../lib/elements/balances';
import type { ElementEvent } from '../lib/types';
import type { Landmarks } from '../lib/geometry';
import { standing, frontSplitBalance, attitudeBalance, frames, repeat } from '../lib/library/examples/poses';

function judged(make: () => Landmarks, n = 40) {
  const events: ElementEvent[] = [];
  const d = new BalanceDetector((e) => events.push(e));
  d.library = null;
  for (const f of frames([...repeat(10, () => standing()), ...repeat(n, make), ...repeat(15, () => standing())])) d.update(f);
  return events[0];
}

test('clean move reads "No points lost" with a friendly name and no codes', () => {
  const m = describeMove(judged(() => frontSplitBalance({ help: true })));
  assertEqual(m.name, 'Front split, holding the leg');
  assertEqual(m.result, 'No points lost');
  assertEqual(m.tone, 'good');
  assert(!/\d\.\d{3}/.test(m.name), 'no element code in the name');
});

test('each deduction becomes one plain sentence with a tip', () => {
  const m = describeMove(judged(() => attitudeBalance({ thighDeg: 84, trunkTilt: 15 })));
  assertEqual(m.result, '0.40 points lost');
  assertEqual(m.reasons.length, 2);
  assert(m.reasons.some((r) => r.text.includes('thigh') && r.tip?.includes('knee')));
  assert(m.reasons.some((r) => r.text.includes('upper body') && r.tip?.includes('Stand taller')));
});

test('short hold explains the 1-second rule in everyday words', () => {
  const r = explainPenalty({ segment: 'hold', holdMs: 600, value: 0.3 });
  assert(r.text.includes('0.6 seconds') && r.text.includes('1 second'));
});

test('flat foot and repeats are explained as notes', () => {
  const m = describeMove(judged(() => frontSplitBalance({ help: true, releve: false })), 'repeat');
  assert(m.notes.some((n) => n.includes('flat foot')));
  assert(m.notes.some((n) => n.includes('already done')));
});

test('live message: hold dots fill to 4 in one second, tip when something is off', () => {
  const live = { shape: 'attitude' as const, label: 'Attitude', holdMs: 500, penalties: [{ segment: 'thigh', measuredDeg: 15, value: 0.3 }] };
  const msg = liveMessage(live);
  assertEqual(msg.dots, 2);
  assertEqual(msg.tone, 'warn');
  assert(msg.text.includes('knee') && msg.text.includes('0.30'));
  assertEqual(liveMessage({ shape: 'attitude', holdMs: 1200, penalties: [] }).text, 'Looks good ✓');
});

test('technical hints are translated', () => {
  assertEqual(plainHint('Turn side-on to the camera'), 'Turn sideways to the camera.');
  assert(liveMessage({ shape: null, hint: 'Whole body and both feet must be in view' }).text.includes('Step back'));
});

test('model loader says how much has downloaded', () => {
  assertEqual(modelDownloadText(12_400_000, 30_664_242), '12 of 31 MB');
  assertEqual(modelDownloadText(30_664_242, 30_664_242), 'Downloaded. Starting it up…');
  assertEqual(modelDownloadText(5_000_000, null), '5 MB downloaded');
});
