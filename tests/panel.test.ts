import { test, assert, assertEqual } from './harness';
import {
  canStart, combineScores, defaultParticipantName, panelScore, roleForNewJudge, rolesWithoutJudge, round3,
} from '../lib/competition/panel';

test('one judge in a role: their score is the panel score', () => {
  assertEqual(panelScore([8.7]).score, 8.7);
  assertEqual(panelScore([8.7]).dropped.length, 0);
});

test('nobody in a role yet: no panel score', () => {
  assertEqual(panelScore([]).score, null);
});

test('2 or 3 judges in a role: plain average, nothing dropped', () => {
  assertEqual(panelScore([8.5, 8.9]).score, 8.7);
  const three = panelScore([8.4, 8.6, 9.1]);
  assertEqual(three.score, 8.7);
  assertEqual(three.dropped.length, 0);
});

test('4 judges in a role: highest and lowest dropped, the middle two averaged (FIG style)', () => {
  const p = panelScore([9.0, 7.0, 8.6, 8.8]);
  assertEqual(p.score, 8.7);
  assertEqual([...p.dropped].sort().join(), '0,1'); // 9.0 and 7.0
});

test('equal scores: only one highest and one lowest are dropped', () => {
  const p = panelScore([8.5, 8.5, 8.5, 8.5]);
  assertEqual(p.dropped.length, 2);
  assertEqual(p.score, 8.5);
});

test('scores are kept to 3 decimals, as in RG results', () => {
  assertEqual(panelScore([8.1, 8.2, 8.4]).score, 8.233);
  assertEqual(round3(26.85049), 26.85);
});

test('final = D + A + E - penalties', () => {
  const r = combineScores({ D: [5.4, 5.6], A: [8.2], E: [7.9] }, 0.3);
  assert(r !== null);
  assertEqual(r.D, 5.5);
  assertEqual(r.A, 8.2);
  assertEqual(r.E, 7.9);
  assertEqual(r.penalties, 0.3);
  assertEqual(r.final, 21.3);
});

test('no result while a role with a judge has not sent a score', () => {
  assertEqual(combineScores({ D: [5], A: [], E: [8] }), null);
  assertEqual(combineScores({ D: [5], A: [], E: [] }, 0, ['D', 'E']), null);
});

test('one judge: the roles without a judge are left out of the final', () => {
  const r = combineScores({ D: [5.4], A: [], E: [] }, 0.3, ['D']);
  assert(r !== null);
  assertEqual(r.D, 5.4);
  assertEqual(r.A, null);
  assertEqual(r.E, null);
  assertEqual(r.final, 5.1);
  const e = combineScores({ D: [], A: [], E: [8.2] }, 0, ['E']);
  assertEqual(e?.final, 8.2);
});

test('two roles judged: final = their sum - penalties', () => {
  const r = combineScores({ D: [5], A: [], E: [8] }, 0.5, ['D', 'E']);
  assertEqual(r?.final, 12.5);
});

test('no scores at all: no result', () => {
  assertEqual(combineScores({ D: [], A: [], E: [] }, 0, []), null);
});

test('A and E stay within 0-10 and the final is never negative', () => {
  const r = combineScores({ D: [0], A: [12], E: [-1] }, 50);
  assert(r !== null);
  assertEqual(r.A, 10);
  assertEqual(r.E, 0);
  assertEqual(r.final, 0);
});

test('new judges get the role with the fewest judges: D, A, E, then D again', () => {
  assertEqual(roleForNewJudge([]), 'D');
  assertEqual(roleForNewJudge(['D']), 'A');
  assertEqual(roleForNewJudge(['D', 'A']), 'E');
  assertEqual(roleForNewJudge(['D', 'A', 'E']), 'D');
  assertEqual(roleForNewJudge(['D', 'D', 'E']), 'A');
});

test('the competition starts with one judge in any role and a participant', () => {
  assertEqual(canStart([], 5).reason, 'Waiting for a judge to join.');
  assertEqual(canStart(['D'], 0).reason, 'Add at least one participant.');
  assert(canStart(['D'], 1).ok);
  assert(canStart(['E'], 1).ok);
  assert(canStart(['D', 'D'], 3).ok);
  assert(canStart(['D', 'A', 'E', 'E'], 8).ok);
});

test('roles without a judge are named for the organizer', () => {
  assertEqual(rolesWithoutJudge(['D']).join(), 'A,E');
  assertEqual(rolesWithoutJudge(['D', 'A', 'E']).length, 0);
});

test('participants are numbered until the organizer names them', () => {
  assertEqual(defaultParticipantName(1), 'Participant 1');
  assertEqual(defaultParticipantName(12), 'Participant 12');
});
