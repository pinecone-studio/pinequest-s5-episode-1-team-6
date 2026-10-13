import { test, assert, assertEqual } from './harness';
import { readFirebaseConfig } from '../lib/firebase/config';
import { authErrorText } from '../lib/firebase/errors';
import { toAccount } from '../lib/firebase/auth';

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
  assert(authErrorText('auth/configuration-not-found')?.includes('Email/Password'));
});

test('closing the Google window yourself shows no error', () => {
  assertEqual(authErrorText('auth/popup-closed-by-user'), null);
  assertEqual(authErrorText('auth/cancelled-popup-request'), null);
});

test('google sign-in errors say what to do', () => {
  assert(authErrorText('auth/popup-blocked')?.includes('pop-ups'));
  assert(authErrorText('auth/unauthorized-domain')?.includes('Authorized domains'));
  assert(authErrorText('auth/operation-not-allowed')?.includes('Sign-in method'));
});

test('guest sign-in error says how to turn it on', () => {
  assert(authErrorText('auth/admin-restricted-operation')?.includes('Anonymous'));
});

test('account shows the name, else the email, else Guest', () => {
  const base = { uid: 'u1', displayName: null, email: null, isAnonymous: false };
  assertEqual(toAccount({ ...base, displayName: ' Saraa ', email: 'saraa@example.com' }).name, 'Saraa');
  assertEqual(toAccount({ ...base, email: 'saraa@example.com' }).name, 'saraa@example.com');
  const guest = toAccount({ ...base, isAnonymous: true });
  assertEqual(guest.name, 'Guest');
  assertEqual(guest.isGuest, true);
});
