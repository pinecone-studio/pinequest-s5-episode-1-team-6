'use client';

// Sign in or create an account: email and password, Google, or "Try without an account" (guest).
// "Forgot password?" switches to <ResetPasswordForm />. Moving on after sign-in is <LoginScreen />'s job.

import { useState, type FormEvent } from 'react';
import { createAccount, signInAsGuest, signInWithEmail, signInWithGoogle } from '@/lib/firebase/auth';
import { useAuth } from './AuthProvider';
import { useAuthAction } from './useAuthAction';
import { AuthFrame, ErrorText, linkButton } from './AuthMessages';
import { PasswordInput } from './PasswordInput';
import { ResetPasswordForm } from './ResetPasswordForm';
import { ghostButton, input, primaryButton, secondaryButton } from '../ui';

type Mode = 'sign-in' | 'sign-up' | 'reset';

export function LoginForm() {
  const { refresh } = useAuth();
  const { busy, error, run, clearError } = useAuthAction();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signingUp = mode === 'sign-up';

  const switchMode = (next: Mode) => {
    setMode(next);
    clearError();
  };

  if (mode === 'reset') return <ResetPasswordForm initialEmail={email} onBack={() => switchMode('sign-in')} />;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      if (!signingUp) return signInWithEmail(email, password);
      await createAccount(name, email, password);
      refresh(); // show the new name in the header
    });
  }

  return (
    <AuthFrame intro={signingUp ? 'Create an account to practice and judge.' : 'Sign in to practice and judge.'}>
      <form className="grid gap-3 rounded-[14px] bg-card p-5" onSubmit={onSubmit}>
        {signingUp && (
          <label className="grid gap-1 text-sm font-semibold">
            Your name
            <input
              className={input}
              type="text"
              autoComplete="name"
              value={name}
              required
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}
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
        <PasswordInput
          value={password}
          onChange={setPassword}
          autoComplete={signingUp ? 'new-password' : 'current-password'}
        />
        {!signingUp && (
          <button type="button" className={linkButton} onClick={() => switchMode('reset')}>
            Forgot password?
          </button>
        )}
        <ErrorText error={error} />
        <button className={primaryButton} type="submit" disabled={busy}>
          {busy ? 'Please wait…' : signingUp ? 'Create account' : 'Sign in'}
        </button>
        <p className="m-0 text-center text-sm text-muted">or</p>
        <button className={secondaryButton} type="button" disabled={busy} onClick={() => void run(signInWithGoogle)}>
          Continue with Google
        </button>
        <button className={ghostButton} type="button" disabled={busy} onClick={() => void run(signInAsGuest)}>
          Try without an account
        </button>
      </form>
      <button type="button" className={linkButton} onClick={() => switchMode(signingUp ? 'sign-in' : 'sign-up')}>
        {signingUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
      </button>
    </AuthFrame>
  );
}
