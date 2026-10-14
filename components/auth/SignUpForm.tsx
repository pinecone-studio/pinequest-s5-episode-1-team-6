'use client';

// The /signup page: name, email and password, Google, or guest. Moving on after sign-up is
// <AuthScreen />'s job.

import { useState, type FormEvent } from 'react';
import { createAccount } from '@/lib/firebase/auth';
import { LOGIN_PATH, withNext } from '@/lib/ui/loginRedirect';
import { useAuth } from './AuthProvider';
import { useAuthAction } from './useAuthAction';
import { useNextPath } from './useNextPath';
import { AuthFrame, ErrorText, formCard, SwitchPage } from './AuthMessages';
import { PasswordField, TextField } from './Fields';
import { OtherSignInOptions } from './OtherSignInOptions';
import { primaryButton } from '../ui';

export function SignUpForm() {
  const { refresh } = useAuth();
  const { busy, error, run } = useAuthAction();
  const next = useNextPath();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      await createAccount(name, email, password);
      refresh(); // show the new name in the header
    });
  }

  return (
    <AuthFrame intro="Create an account to practice and judge.">
      <form className={formCard} onSubmit={onSubmit}>
        <TextField label="Your name" type="text" autoComplete="name" value={name} onChange={setName} />
        <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={setEmail} />
        <PasswordField value={password} onChange={setPassword} autoComplete="new-password" hint="At least 6 characters." />
        <ErrorText error={error} />
        <button className={primaryButton} type="submit" disabled={busy}>
          {busy ? 'Please wait…' : 'Create account'}
        </button>
        <OtherSignInOptions busy={busy} run={run} />
        <SwitchPage question="Already have an account?" action="Sign in" href={withNext(LOGIN_PATH, next)} />
      </form>
    </AuthFrame>
  );
}
