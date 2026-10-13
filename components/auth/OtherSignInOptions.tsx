'use client';

// "Continue with Google" and "Try without an account" (guest), under both the sign-in and the sign-up form.
// They share the form's busy flag and error line, so only one action runs at a time.
// A guest who came here from the app gets "Keep going without an account" (back) instead of the guest button.
// <AuthScreen /> keeps guests on this page (so they can sign in), so "Try without an account" moves on itself.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInAsGuest, signInWithGoogle } from '@/lib/firebase/auth';
import { useAuth } from './AuthProvider';
import { useNextPath } from './useNextPath';
import { ghostButton, secondaryButton } from '../ui';

export function OtherSignInOptions({ busy, run }: { busy: boolean; run: (action: () => Promise<void>) => Promise<boolean> }) {
  const { state } = useAuth();
  const router = useRouter();
  const next = useNextPath();
  const isGuest = state.status === 'signed-in' && state.account.isGuest;

  async function tryAsGuest() {
    if (await run(signInAsGuest)) router.replace(next);
  }

  return (
    <>
      <p className="m-0 text-center text-sm text-muted">or</p>
      <button className={secondaryButton} type="button" disabled={busy} onClick={() => void run(signInWithGoogle)}>
        Continue with Google
      </button>
      {isGuest ? (
        <Link className={ghostButton} href={next}>
          Keep going without an account
        </Link>
      ) : (
        <button className={ghostButton} type="button" disabled={busy} onClick={() => void tryAsGuest()}>
          Try without an account
        </button>
      )}
    </>
  );
}
