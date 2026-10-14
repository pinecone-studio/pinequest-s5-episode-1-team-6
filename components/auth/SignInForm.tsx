'use client';

// The /login page: email and password, Google, or guest. "Forgot password?" switches to
// <ResetPasswordForm />. Moving on after sign-in is <AuthScreen />'s job.

import { useState, type FormEvent } from 'react';
import { signInWithEmail } from '@/lib/firebase/auth';
import { SIGNUP_PATH, withNext } from '@/lib/ui/loginRedirect';
import { useAuthAction } from './useAuthAction';
import { useNextPath } from './useNextPath';
import { AuthFrame, ErrorText, formCard, linkButton, SwitchPage } from './AuthMessages';
import { PasswordField, TextField } from './Fields';
import { OtherSignInOptions } from './OtherSignInOptions';
import { ResetPasswordForm } from './ResetPasswordForm';
import { primaryButton } from '../ui';

export function SignInForm() {
  const { busy, error, run, clearError } = useAuthAction();
  const next = useNextPath();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  if (resetting) {
    const back = () => {
      setResetting(false);
      clearError();
    };
    return <ResetPasswordForm initialEmail={email} onBack={back} />;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(() => signInWithEmail(email, password));
  }

  return (
    <AuthFrame intro="Sign in to practice and judge.">
      <form className={formCard} onSubmit={onSubmit}>
        <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={setEmail} />
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        <button type="button" className={linkButton} onClick={() => setResetting(true)}>
          Forgot password?
        </button>
        <ErrorText error={error} />
        <button className={primaryButton} type="submit" disabled={busy}>
          {busy ? 'Please wait…' : 'Sign in'}
        </button>
        <OtherSignInOptions busy={busy} run={run} />
        <SwitchPage question="New here?" action="Create an account" href={withNext(SIGNUP_PATH, next)} />
      </form>
    </AuthFrame>
  );
}
