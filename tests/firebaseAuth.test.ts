import { test, assert, assertEqual } from './harness';
import { readFirebaseConfig } from '../lib/firebase/config';
import { authErrorText } from '../lib/firebase/errors';

const FULL = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'app.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'app',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:1:web:abc',
};

test('firebase config is missing until all four public values are set', () => {
  const read = readFirebaseConfig({});
  assertEqual(read.ok, false);
  if (!read.ok) assertEqual(read.missing.length, 4);
});

test('firebase config ignores blank values', () => {
  const read = readFirebaseConfig({ ...FULL, NEXT_PUBLIC_FIREBASE_APP_ID: '  ' });
  assertEqual(read.ok, false);
  if (!read.ok) assertEqual(read.missing[0], 'NEXT_PUBLIC_FIREBASE_APP_ID');
});

test('firebase config returns the trimmed web settings', () => {
  const read = readFirebaseConfig({ ...FULL, NEXT_PUBLIC_FIREBASE_API_KEY: ' key ' });
  assertEqual(read.ok, true);
  if (read.ok) assertEqual(read.config.apiKey, 'key');
});

test('auth errors use plain sentences', () => {
  assertEqual(authErrorText('auth/email-already-in-use'), 'That email already has an account. Sign in instead.');
  assertEqual(authErrorText('auth/invalid-credential'), 'Email or password is wrong.');
  assertEqual(authErrorText('auth/something-else'), 'Something went wrong. Try again.');
  assert(authErrorText('auth/configuration-not-found').includes('Email/Password'));
});
