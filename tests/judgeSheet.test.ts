import { test, assert, assertEqual } from './harness';
import {
  addQuick, aiScore, allSuggestionsAdded, removeItem, sheetScore, sheetTotal, signed, suggestionsFor, toggleAllSuggestions,
  toggleSuggestion, undo, type SheetItem,
} from '../lib/competition/judgeSheet';
import type { LiveState } from '../lib/competition/types';

const live: LiveState = {
  pid: 'p001',
  startedAt: 0,
  updatedAt: 0,
  now: null,
  moves: [
    { id: 1, name: 'Attitude', dbValue: 0.2, counts: true, deductions: [{ text: 'The raised thigh was 14° below hip height.', value: 0.3 }], note: null },
    { id: 2, name: 'Front split, holding the leg', dbValue: 0.3, counts: true, deductions: [], note: null },
    { id: 3, name: 'Attitude', dbValue: 0.2, counts: false, deductions: [{ text: 'Held for 0.8 seconds.', value: 0.3 }], note: 'Not counted again: this move was already done earlier.' },
  ],
};

test('D judge: the AI suggests every difficulty that counts, newest first', () => {
  const s = suggestionsFor('D', live).filter((x) => x.addable);
  assertEqual(s.map((x) => `${x.label} ${x.value}`).join(' | '), 'Front split, holding the leg 0.3 | Attitude 0.2');
});

test('D judge: a move that does not count still shows up, as information with the reason', () => {
  const [info] = suggestionsFor('D', live);
  assert(!info.addable, 'cannot be added');
  assertEqual(info.detail, 'Not counted again: this move was already done earlier.');
});

test('E judge: the AI suggests every deduction it measured, also on a repeated move', () => {
  const s = suggestionsFor('E', live).filter((x) => x.addable);
  assertEqual(s.length, 2);
  assertEqual(s[0].detail, 'Held for 0.8 seconds.');
  assertEqual(s[1].value, 0.3);
});

test('E judge: a move without a deduction shows up as "No points lost." and cannot be added', () => {
  const ok = suggestionsFor('E', live).filter((x) => !x.addable);
  assertEqual(ok.map((x) => `${x.label}: ${x.detail}`).join(), 'Front split, holding the leg: No points lost.');
  assertEqual(toggleSuggestion([], ok[0]).length, 0);
});

test('A judge: no AI suggestions (the AI does not judge artistry)', () => {
  assertEqual(suggestionsFor('A', live).length, 0);
  assertEqual(suggestionsFor('E', null).length, 0);
});

test('D adds up; A and E are 10 minus the deductions', () => {
  const items: SheetItem[] = [
    { id: '1', label: 'x', value: 0.3, fromAi: false },
    { id: '2', label: 'x', value: 0.1, fromAi: false },
    { id: '3', label: 'x', value: 0.2, fromAi: false },
  ];
  assertEqual(sheetScore('D', items), 0.6);
  assertEqual(sheetScore('E', items), 9.4);
  assertEqual(sheetScore('A', items), 9.4);
  assertEqual(sheetTotal(items), 0.6);
  assertEqual(sheetScore('E', []), 10);
});

test('a score never goes below 0', () => {
  const many = Array.from({ length: 30 }, (_, i): SheetItem => ({ id: String(i), label: 'x', value: 0.5, fromAi: false }));
  assertEqual(sheetScore('E', many), 0);
});

test('tapping a suggestion adds it; tapping again takes it off', () => {
  const s = suggestionsFor('E', live).filter((x) => x.addable)[1];
  let items = toggleSuggestion([], s);
  assertEqual(items.length, 1);
  assert(items[0].fromAi);
  items = toggleSuggestion(items, s);
  assertEqual(items.length, 0);
});

test("the AI's score: D the difficulties it counted, E 10 minus its deductions; none before the first move", () => {
  assertEqual(aiScore('D', suggestionsFor('D', live)), 0.5);
  assertEqual(aiScore('E', suggestionsFor('E', live)), 9.4);
  assertEqual(aiScore('E', suggestionsFor('E', null)), null);
  const clean: LiveState = { ...live, moves: [live.moves[1]] }; // judged, nothing lost
  assertEqual(aiScore('E', suggestionsFor('E', clean)), 10);
});

test("tapping the AI's score adds every suggestion once, keeps the judge's lines; again takes them off", () => {
  const suggestions = suggestionsFor('E', live);
  const mine = addQuick([], 'E', 0.1);
  const one = toggleSuggestion(mine, suggestions.filter((x) => x.addable)[0]); // one already on the sheet
  let items = toggleAllSuggestions(one, suggestions);
  assertEqual(items.length, 3);
  assert(allSuggestionsAdded(items, suggestions), 'all on the sheet');
  assertEqual(sheetScore('E', items), 9.3);
  items = toggleAllSuggestions(items, suggestions);
  assertEqual(items.map((i) => i.id).join(), 'q1');
  assert(!allSuggestionsAdded(items, suggestions), 'taken off');
});

test("the AI's score adds nothing when there is nothing to add", () => {
  const clean: LiveState = { ...live, moves: [live.moves[1]] };
  const suggestions = suggestionsFor('E', clean);
  assertEqual(toggleAllSuggestions([], suggestions).length, 0);
  assert(!allSuggestionsAdded([], suggestions), 'nothing to add is not "all added"');
});

test('quick buttons, remove and undo', () => {
  let items = addQuick([], 'E', 0.1);
  items = addQuick(items, 'E', 0.5);
  assertEqual(items[0].label, 'Deduction');
  assertEqual(addQuick([], 'D', 0.3).at(0)?.label, 'Difficulty');
  assertEqual(undo(items).map((i) => i.id).join(), 'q1');
  assertEqual(removeItem(items, 'q1').map((i) => i.id).join(), 'q2');
});

test('quick lines get ids that are unique on the sheet, also after a removal', () => {
  let items = addQuick(addQuick([], 'E', 0.1), 'E', 0.3); // q1, q2
  items = removeItem(items, 'q1');
  items = addQuick(items, 'E', 0.5);
  assertEqual(items.map((i) => i.id).join(), 'q2,q3');
});

test('values show their direction', () => {
  assertEqual(signed('D', 0.3), '+0.30');
  assertEqual(signed('E', 0.1), '−0.10');
});
