import { test, assert, assertEqual } from './harness';
import { judgeLink, newJoinKey, participantChanges, participantId } from '../lib/competition/links';

test('the QR link opens the judge page with the competition and its key', () => {
  assertEqual(judgeLink('https://rhymnast.pages.dev', 'abc123', 'K-e_y'), 'https://rhymnast.pages.dev/judge?c=abc123&k=K-e_y');
  const url = new URL(judgeLink('http://localhost:3000', 'a b', 'x&y'));
  assertEqual(url.searchParams.get('c'), 'a b');
  assertEqual(url.searchParams.get('k'), 'x&y');
});

test('join keys are 22 URL-safe characters and differ each time', () => {
  const a = newJoinKey();
  const b = newJoinKey();
  assert(/^[A-Za-z0-9_-]{22}$/.test(a), a);
  assert(a !== b);
  assertEqual(newJoinKey((bytes) => bytes.fill(255)), '_____________________w');
});

test('participant ids sort in starting order', () => {
  assertEqual(participantId(1), 'p001');
  assertEqual(participantId(42), 'p042');
  assert(participantId(9) < participantId(10));
});

const p = (order: number, status = 'waiting') => ({ id: participantId(order), order, status });

test('setting a participant count adds numbered participants at the end', () => {
  const c = participantChanges([p(1), p(2)], 4);
  assertEqual(c.add.map((x) => `${x.id}:${x.name}`).join(), 'p003:Participant 3,p004:Participant 4');
  assertEqual(c.remove.length, 0);
  assertEqual(participantChanges([], 2).add.map((x) => x.order).join(), '1,2');
});

test('a smaller count removes from the end, but never someone who has performed', () => {
  assertEqual(participantChanges([p(1), p(2), p(3)], 1).remove.join(), 'p003,p002');
  assertEqual(participantChanges([p(1), p(2, 'done'), p(3)], 1).remove.join(), 'p003');
  assertEqual(participantChanges([p(1), p(2)], 2).add.length + participantChanges([p(1), p(2)], 2).remove.length, 0);
});

test('after a removal, new participants continue the numbering without reusing a name', () => {
  const c = participantChanges([p(1), p(2, 'done'), p(5)], 4);
  assertEqual(c.add.map((x) => x.order).join(), '6');
});
