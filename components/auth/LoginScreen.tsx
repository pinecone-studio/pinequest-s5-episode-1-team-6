'use client';

// The /login page: the sign-in form, or straight on to `?next=` (or "/") once someone is signed in.

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeNextPath } from '@/lib/ui/loginRedirect';
import { useAuth } from './AuthProvider';
import { CheckingAccount, SetupNeeded } from './AuthMessages';
import { LoginForm } from './LoginForm';

export function LoginScreen() {
  const { state } = useAuth();
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('next'));

  useEffect(() => {
    if (state.status === 'signed-in') router.replace(next);
  }, [state.status, next, router]);

  if (state.status === 'setup-needed') return <SetupNeeded missing={state.missing} />;
  if (state.status === 'signed-out') return <LoginForm />;
  return <CheckingAccount />;
}
