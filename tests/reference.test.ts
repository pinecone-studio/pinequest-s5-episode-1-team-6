import { existsSync } from 'node:fs';
import { test, assertEqual } from './harness';
import { REFERENCE_VIDEOS, referenceVideoFor } from '../lib/reference';

test('the three balances have a reference video in rhythmic gymnastics', () => {
  assertEqual(referenceVideoFor('gymnastics', '2.303'), '/reference/front-split-with-help.mp4');
  assertEqual(referenceVideoFor('gymnastics', '2.1104'), '/reference/back-split-body-forward.mp4');
  assertEqual(referenceVideoFor('gymnastics', '2.1202'), '/reference/attitude.mp4');
});

test('no reference video for other moves or other sports', () => {
  assertEqual(referenceVideoFor('gymnastics', '2.1005'), null); // back split, foot above the head: no clip yet
  assertEqual(referenceVideoFor('cheer', '2.303'), null);
  assertEqual(referenceVideoFor('ballet', '2.1202'), null);
});

test('every reference video is in public/', () => {
  for (const src of REFERENCE_VIDEOS) assertEqual(existsSync(`public${src}`), true, src);
});
