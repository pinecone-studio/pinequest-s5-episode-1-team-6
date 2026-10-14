'use client';

// Account buttons for page navbars inside <RequireAuth>: small and quiet (navButton), not a main action.
// Signed in: the name and Sign out. Guest: Sign in instead (a guest has nothing to sign out of);
// /login links to Create account, and both come back here afterwards.
// On phones only the icon shows (the word is its label), so the navbar fits on one line.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAccount } from '@/lib/firebase/auth';
import { LOGIN_PATH, withNext } from '@/lib/ui/loginRedirect';
import { useAuth } from './AuthProvider';
import { navButton } from '../ui';

export function AccountButton() {
  const { state } = useAuth();
  const pathname = usePathname();
  if (state.status !== 'signed-in') return null;
  const { name, isGuest } = state.account;

  if (isGuest) {
    return (
      <Link className={`${navButton} max-sm:px-2`} href={withNext(LOGIN_PATH, pathname)} aria-label="Sign in">
        <UserIcon />
        <span className="max-sm:hidden">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="max-w-[160px] truncate text-sm text-muted max-sm:hidden" title={name}>{name}</span>
      <button type="button" className={`${navButton} max-sm:px-2`} aria-label="Sign out" onClick={() => void signOutAccount()}>
        <SignOutIcon />
        <span className="max-sm:hidden">Sign out</span>
      </button>
    </div>
  );
}

const iconProps = {
  width: 17,
  height: 17,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** A person, for Sign in. */
function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

/** A door with an arrow out, for Sign out. */
function SignOutIcon() {
  return (
    <svg {...iconProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
