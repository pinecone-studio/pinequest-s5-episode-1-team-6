import { test, assertEqual } from './harness';
import { leaderboard } from '../lib/competition/ranking';
import type { Participant } from '../lib/competition/types';

const p = (order: number, status: Participant['status'], final?: number): Participant => ({
  id: `p${order}`, order, name: `P${order}`, status, penalties: 0,
  result: final === undefined ? null : { D: 0, A: 0, E: 0, penalties: 0, final },
});

test('the leaderboard shows results best first', () => {
  const b = leaderboard([p(1, 'done', 17.9), p(2, 'done', 21.35), p(3, 'done', 19)]);
  assertEqual(b.ranked.map((r) => `${r.rank}.${r.name}`).join(' '), '1.P2 2.P3 3.P1');
});

test('equal totals share a place, and the next place is skipped', () => {
  const b = leaderboard([p(1, 'done', 18), p(2, 'done', 20), p(3, 'done', 18), p(4, 'done', 17)]);
  assertEqual(b.ranked.map((r) => `${r.rank}.${r.name}`).join(' '), '1.P2 2.P1 2.P3 4.P4');
});

test('who performs now and who is still waiting are listed apart', () => {
  const b = leaderboard([p(1, 'done', 18), p(2, 'scoring'), p(4, 'waiting'), p(3, 'waiting')]);
  assertEqual(b.ranked.length, 1);
  assertEqual(b.now?.name, 'P2');
  assertEqual(b.waiting.map((w) => w.name).join(), 'P3,P4');
});
