// Full-page pieces of the sign-in screens: the frame around the forms and the setup message.
// While the account is being checked, components/Skeletons.tsx is shown instead.

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { FirebasePublicKey } from '@/lib/firebase/config';
import { smallText } from '../ui';

/** App name in the sport's heading font and one line of intro, then the form: one column in the middle of the screen. */
export function AuthFrame({ intro, children }: { intro: string; children: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-5 px-[clamp(16px,4vw,40px)] py-16">
      <div className="text-center">
        <h1 className="m-0 font-display text-[40px] leading-none text-accent">Rhymnast</h1>
        <p className="mt-2 mb-0 text-[15px] text-muted">{intro}</p>
      </div>
      {children}
    </main>
  );
}

/** "or" between the main button and the other ways in, with a line on each side. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
      or
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  );
}

/** The last line of the card: "New here? Create an account" and the like. */
const switchLine = 'm-0 border-t border-line pt-4 text-center text-[15px] text-muted';
const switchAction = 'cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent underline-offset-4 hover:underline';

/** Link to the other sign-in page, at the bottom of the card. */
export function SwitchPage({ question, action, href }: { question: string; action: string; href: string }) {
  return (
    <p className={switchLine}>
      {question}{' '}
      <Link className={switchAction} href={href}>
        {action}
      </Link>
    </p>
  );
}

/** Same line with a button (Back to sign in). */
export function SwitchButton({ action, onClick }: { action: string; onClick: () => void }) {
  return (
    <p className={switchLine}>
      <button type="button" className={switchAction} onClick={onClick}>
        {action}
      </button>
    </p>
  );
}

/** The card around a sign-in form. */
export const formCard = 'grid gap-3 rounded-card bg-card p-5';

/** Text-style button under a form ("New here? Create an account"). */
export const linkButton = 'w-fit cursor-pointer border-0 bg-transparent p-0 text-left text-sm font-semibold text-accent';

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
