// Full-page pieces of the sign-in screens: the frame around the forms and the setup message.
// While the account is being checked, components/Skeletons.tsx is shown instead.

import type { ReactNode } from 'react';
import type { FirebasePublicKey } from '@/lib/firebase/config';
import { smallText } from '../ui';

/** One line of intro, then the form. The logo is in the top left corner (app/(auth)/layout.tsx). */
export function AuthFrame({ intro, children }: { intro: string; children: ReactNode }) {
  return (
    <main className="mx-auto grid max-w-md gap-4 px-[clamp(16px,4vw,40px)] pt-16 pb-12">
      <div>
        <h1 className="sr-only">Rhymnast</h1>
        <p className="m-0 text-[15px] text-muted">{intro}</p>
      </div>
      {children}
    </main>
  );
}

/** The card around a sign-in form. */
export const formCard = 'grid gap-3 rounded-card bg-card p-5';

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

export function SetupNeeded({ missing }: { missing: FirebasePublicKey[] }) {
  return (
    <main className="mx-auto grid max-w-lg gap-3 px-[clamp(16px,4vw,40px)] pt-16">
      <h1 className="m-0 text-[26px] leading-tight font-bold text-accent">Rhymnast</h1>
      <p className="m-0">Sign-in is not set up on this computer yet.</p>
      <p className={smallText}>
        The Firebase web app settings are missing. Copy <code>.env.example</code> to <code>.env</code>, fill in
        the values from the Firebase console (Project settings → Your apps), and restart <code>npm run dev</code>.
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
