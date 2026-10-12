'use client';

// Sign-in in front of the app (email, Google or guest). The camera stays off until someone is signed in.
// The signed-in person is shared through a context; <AccountButton /> shows it in a page header.

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { firebaseConfigFromProcessEnv, type FirebasePublicKey } from '@/lib/firebase/config';
import { authErrorText, firebaseErrorCode } from '@/lib/firebase/errors';
import { getClientAuth } from '@/lib/firebase/client';
import { ghostButton, input, primaryButton, secondaryButton, smallText } from './ui';

type Mode = 'sign-in' | 'sign-up';

const AccountContext = createContext<User | null>(null);

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

  return <AccountContext.Provider value={user}>{children}</AccountContext.Provider>;
}

/** Who is signed in, and Sign out. For page headers inside <AuthGate>. */
export function AccountButton() {
  const user = useContext(AccountContext);
  if (!user) return null;
  const who = user.isAnonymous ? 'Guest' : user.displayName ?? user.email;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`${smallText} max-w-[200px] truncate max-sm:hidden`} title={who ?? undefined}>{who}</span>
      <button type="button" className={ghostButton} onClick={() => void signOut(getClientAuth())}>
        Sign out
      </button>
    </div>
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

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(getClientAuth(), provider);
    } catch (err) {
      setError(authErrorText(firebaseErrorCode(err)));
    } finally {
      setBusy(false);
    }
  }

  async function onGuest() {
    setError(null);
    setBusy(true);
    try {
      await signInAnonymously(getClientAuth());
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
        <p className="m-0 text-center text-sm text-muted">or</p>
        <button className={secondaryButton} type="button" disabled={busy} onClick={() => void onGoogle()}>
          Continue with Google
        </button>
        <button className={ghostButton} type="button" disabled={busy} onClick={() => void onGuest()}>
          Try without an account
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
