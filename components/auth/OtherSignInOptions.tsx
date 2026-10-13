'use client';

// "Continue with Google" and "Try without an account" (guest), under both the sign-in and the sign-up form.
// They share the form's busy flag and error line, so only one action runs at a time.

import { signInAsGuest, signInWithGoogle } from '@/lib/firebase/auth';
import { ghostButton, secondaryButton } from '../ui';

export function OtherSignInOptions({ busy, run }: { busy: boolean; run: (action: () => Promise<void>) => Promise<boolean> }) {
  return (
    <>
      <p className="m-0 text-center text-sm text-muted">or</p>
      <button className={secondaryButton} type="button" disabled={busy} onClick={() => void run(signInWithGoogle)}>
        Continue with Google
      </button>
      <button className={ghostButton} type="button" disabled={busy} onClick={() => void run(signInAsGuest)}>
        Try without an account
      </button>
    </>
  );
}
