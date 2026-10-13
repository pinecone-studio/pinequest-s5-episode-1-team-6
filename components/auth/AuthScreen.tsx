'use client';

// Frame of the sign-in pages (/login, /signup): shows the page's form to someone who is signed out,
// and moves on to `?next=` (or "/") as soon as someone is signed in.

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { CheckingAccount, SetupNeeded } from './AuthMessages';
import { useNextPath } from './useNextPath';

export function AuthScreen({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const next = useNextPath();

  useEffect(() => {
    if (state.status === 'signed-in') router.replace(next);
  }, [state.status, next, router]);

  if (state.status === 'setup-needed') return <SetupNeeded missing={state.missing} />;
  if (state.status === 'signed-out') return children;
  return <CheckingAccount />;
}
