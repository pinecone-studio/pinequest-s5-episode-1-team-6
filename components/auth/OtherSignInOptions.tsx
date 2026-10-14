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
import { OrDivider } from './AuthMessages';
import { ghostButton, googleButton } from '../ui';

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
      <OrDivider />
      <button className={googleButton} type="button" disabled={busy} onClick={() => void run(signInWithGoogle)}>
        <GoogleLogo />
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

/** Google's "G" in its own colors (Google's sign-in button rules ask for it unchanged). */
function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
