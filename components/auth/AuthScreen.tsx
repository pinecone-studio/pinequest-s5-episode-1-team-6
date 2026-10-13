'use client';

// Frame of the sign-in pages (/login, /signup): shows the page's form to someone who is signed out
// or a guest, and moves on to `?next=` (or "/") as soon as someone is signed in with an account.

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { SetupNeeded } from './AuthMessages';
import { AuthFormSkeleton } from '../Skeletons';
import { useNextPath } from './useNextPath';

export function AuthScreen({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const next = useNextPath();
  const isGuest = state.status === 'signed-in' && state.account.isGuest;
  const hasAccount = state.status === 'signed-in' && !state.account.isGuest;

  useEffect(() => {
    if (hasAccount) router.replace(next);
  }, [hasAccount, next, router]);

  if (state.status === 'setup-needed') return <SetupNeeded missing={state.missing} />;
  if (state.status === 'signed-out' || isGuest) return children;
  return <AuthFormSkeleton />;
}
