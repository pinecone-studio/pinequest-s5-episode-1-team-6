'use client';

// Email sign-in in front of the app. The camera stays off until someone is signed in.

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseConfigFromProcessEnv, type FirebasePublicKey } from '@/lib/firebase/config';
import { authErrorText, firebaseErrorCode } from '@/lib/firebase/errors';
import { getClientAuth } from '@/lib/firebase/client';
import { ghostButton, input, primaryButton, smallText } from './ui';

type Mode = 'sign-in' | 'sign-up';

export function AuthGate({ children }: { children: ReactNode }) {
  const setup = firebaseConfigFromProcessEnv();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!setup.ok) return;
    return onAuthStateChanged(
      getClientAuth(),
      (next) => {
        setUser(next);
        setReady(true);
      },
      () => setReady(true),
    );
  }, [setup.ok]);

  if (!setup.ok) return <SetupNeeded missing={setup.missing} />;
  if (!ready) {
    return (
      <p className="px-[clamp(16px,4vw,40px)] pt-16 text-center text-muted">Checking your account…</p>
    );
  }
  if (!user) return <AuthForm />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-line px-[clamp(16px,4vw,40px)] py-2.5 print:hidden">
        <p className={`${smallText} min-w-0 truncate`}>Signed in as {user.email}</p>
        <button type="button" className={ghostButton} onClick={() => void signOut(getClientAuth())}>
          Sign out
        </button>
      </div>
      {children}
    </>
  );
}

function SetupNeeded({ missing }: { missing: FirebasePublicKey[] }) {
  return (
    <main className="mx-auto grid max-w-lg gap-3 px-[clamp(16px,4vw,40px)] pt-16">
      <h1 className="m-0 text-[26px] leading-tight font-bold text-accent">Rhymnast</h1>
      <p className="m-0">Sign-in is not set up on this computer yet.</p>
      <p className={smallText}>
        The Firebase web app settings are missing from <code>.env</code>. Add them, turn on
        Email/Password under Authentication in the Firebase console, and restart <code>npm run dev</code>.
      </p>
      <ul className="m-0 grid gap-1 pl-5 text-sm text-muted">
        {missing.map((key) => (
          <li key={key}>
            <code>{key}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signingUp = mode === 'sign-up';

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const auth = getClientAuth();
      if (signingUp) await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(authErrorText(firebaseErrorCode(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid max-w-md gap-4 px-[clamp(16px,4vw,40px)] pt-16 pb-12">
      <div>
        <h1 className="m-0 text-[26px] leading-tight font-bold text-accent">Rhymnast</h1>
        <p className="mt-1 mb-0 text-[15px] text-muted">
          {signingUp ? 'Create an account to practice and judge.' : 'Sign in to practice and judge.'}
        </p>
      </div>
      <form className="grid gap-3 rounded-[14px] bg-card p-5" onSubmit={(event) => void onSubmit(event)}>
        <label className="grid gap-1 text-sm font-semibold">
          Email
          <input
            className={input}
            type="email"
            autoComplete="email"
            value={email}
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Password
          <input
            className={input}
            type="password"
            autoComplete={signingUp ? 'new-password' : 'current-password'}
            value={password}
            required
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && (
          <p className="m-0 text-sm text-bad" role="alert">
            {error}
          </p>
        )}
        <button className={primaryButton} type="submit" disabled={busy}>
          {busy ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <button
        type="button"
        className="cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-semibold text-accent"
        onClick={() => {
          setMode(signingUp ? 'sign-in' : 'sign-up');
          setError(null);
        }}
      >
        {signingUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
    </main>
  );
}
