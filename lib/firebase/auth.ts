// Sign-in actions on the browser Firebase Auth. No React here: components/auth/ calls these.

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { getClientAuth } from './client';

/** The signed-in person, as the app shows them. */
export interface Account {
  uid: string;
  /** Name, else email, else "Guest". */
  name: string;
  isGuest: boolean;
}

export function toAccount(user: Pick<User, 'uid' | 'displayName' | 'email' | 'isAnonymous'>): Account {
  const name = user.isAnonymous ? 'Guest' : user.displayName?.trim() || user.email || 'Signed in';
  return { uid: user.uid, name, isGuest: user.isAnonymous };
}

/** Calls back with the account (or null) now and after every sign-in / sign-out. Returns unsubscribe. */
export function watchAccount(onChange: (account: Account | null) => void, onError: () => void): () => void {
  return onAuthStateChanged(getClientAuth(), (user) => onChange(user ? toAccount(user) : null), onError);
}

/** The account right now. Use after a profile change, which does not trigger watchAccount. */
export function currentAccount(): Account | null {
  const user = getClientAuth().currentUser;
  return user ? toAccount(user) : null;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getClientAuth(), email.trim(), password);
}

/** New email account. The name is saved on the account so the header can show it. */
export async function createAccount(name: string, email: string, password: string): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(getClientAuth(), email.trim(), password);
  const displayName = name.trim();
  if (!displayName) return;
  // The account exists either way; if saving the name fails, the header shows the email instead.
  await updateProfile(user, { displayName }).catch(() => undefined);
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(getClientAuth(), provider);
}

/** Firebase Anonymous sign-in, for demos. */
export async function signInAsGuest(): Promise<void> {
  await signInAnonymously(getClientAuth());
}

/** Emails a link to choose a new password. Firebase does not say whether the email has an account. */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(getClientAuth(), email.trim());
}

export async function signOutAccount(): Promise<void> {
  await signOut(getClientAuth());
}
