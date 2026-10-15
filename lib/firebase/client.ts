// Browser-only Firebase: sign-in (Auth) and the competition data (Firestore).
// Pose judging stays in the browser; nothing about the video is sent anywhere.

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfigFromProcessEnv } from './config';

/** The one Firebase app of this page (created on first use). */
export function getClientApp(): FirebaseApp {
  const read = firebaseConfigFromProcessEnv();
  if (!read.ok) throw new Error('Firebase is not configured');
  return getApps().length > 0 ? getApp() : initializeApp(read.config);
}

export function getClientAuth(): Auth {
  return getAuth(getClientApp());
}

/** Firestore, used only by competition mode (lib/firebase/competition.ts). */
export function getClientDb(): Firestore {
  return getFirestore(getClientApp());
}
