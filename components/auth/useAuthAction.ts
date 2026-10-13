'use client';

// Runs one sign-in action (button press) with a busy flag and a plain error sentence.

import { useState } from 'react';
import { authErrorText, firebaseErrorCode } from '@/lib/firebase/errors';

export function useAuthAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>): Promise<boolean> {
    setError(null);
    setBusy(true);
    try {
      await action();
      return true;
    } catch (err) {
      setError(authErrorText(firebaseErrorCode(err)));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, run, clearError: () => setError(null) };
}
