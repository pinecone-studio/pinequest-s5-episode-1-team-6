// Browser-only Firebase Auth. Pose judging stays in the browser; this only signs the person in.

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { firebaseConfigFromProcessEnv } from './config';

export function getClientAuth(): Auth {
  const read = firebaseConfigFromProcessEnv();
  if (!read.ok) throw new Error('Firebase is not configured');
  const app = getApps().length > 0 ? getApp() : initializeApp(read.config);
  return getAuth(app);
}
