'use client';

// "Forgot password?": Firebase emails a link to choose a new password.

import { useState, type FormEvent } from 'react';
import { sendPasswordReset } from '@/lib/firebase/auth';
import { useAuthAction } from './useAuthAction';
import { AuthFrame, ErrorText, linkButton } from './AuthMessages';
import { input, primaryButton } from '../ui';

export function ResetPasswordForm({ initialEmail, onBack }: { initialEmail: string; onBack: () => void }) {
  const { busy, error, run } = useAuthAction();
  const [email, setEmail] = useState(initialEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (await run(() => sendPasswordReset(email))) setSentTo(email.trim());
  }

  return (
    <AuthFrame intro="Forgot your password? We will email you a link to choose a new one.">
      <form className="grid gap-3 rounded-[14px] bg-card p-5" onSubmit={(event) => void onSubmit(event)}>
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
        {sentTo && (
          <p className="m-0 text-sm text-good" role="status">
            If {sentTo} has an account, a link is on its way. Open it, choose a new password, then sign in here.
          </p>
        )}
        <ErrorText error={error} />
        <button className={primaryButton} type="submit" disabled={busy}>
          {busy ? 'Please wait…' : sentTo ? 'Send the link again' : 'Send link'}
        </button>
      </form>
      <button type="button" className={linkButton} onClick={onBack}>
        Back to sign in
      </button>
    </AuthFrame>
  );
}
