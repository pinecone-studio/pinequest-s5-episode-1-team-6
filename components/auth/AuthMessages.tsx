// Full-page pieces of the sign-in screens: the frame around the forms and the waiting / setup messages.

import type { ReactNode } from 'react';
import type { FirebasePublicKey } from '@/lib/firebase/config';
import { smallText } from '../ui';

/** App name, one line of intro, then the form. */
export function AuthFrame({ intro, children }: { intro: string; children: ReactNode }) {
  return (
    <main className="mx-auto grid max-w-md gap-4 px-[clamp(16px,4vw,40px)] pt-16 pb-12">
      <div>
        <h1 className="m-0 text-[26px] leading-tight font-bold text-accent">Rhymnast</h1>
        <p className="mt-1 mb-0 text-[15px] text-muted">{intro}</p>
      </div>
      {children}
    </main>
  );
}

/** Text-style button under a form ("New here? Create an account"). */
export const linkButton = 'cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-semibold text-accent';

export function ErrorText({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="m-0 text-sm text-bad" role="alert">
      {error}
    </p>
  );
}

export function CheckingAccount() {
  return (
    <p className="px-[clamp(16px,4vw,40px)] pt-16 text-center text-muted" role="status">
      Checking your account…
    </p>
  );
}

export function SetupNeeded({ missing }: { missing: FirebasePublicKey[] }) {
  return (
    <main className="mx-auto grid max-w-lg gap-3 px-[clamp(16px,4vw,40px)] pt-16">
      <h1 className="m-0 text-[26px] leading-tight font-bold text-accent">Rhymnast</h1>
      <p className="m-0">Sign-in is not set up on this computer yet.</p>
      <p className={smallText}>
        The Firebase web app settings are missing from <code>.env</code>. Add them, turn on
        Email/Password under Authentication in the Firebase console, and restart <code>npm run dev</code>.
      </p>
      <ul className="m-0 grid gap-1 pl-5 text-sm text-muted">
        {missing.map((key) => (
          <li key={key}>
            <code>{key}</code>
          </li>
        ))}
      </ul>
    </main>
  );
}
