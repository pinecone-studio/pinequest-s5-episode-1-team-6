'use client';

// Account buttons for page navbars inside <RequireAuth>: small and quiet (navButton), not a main action.
// Signed in: the name and Sign out. Guest: Sign in instead (a guest has nothing to sign out of);
// /login links to Create account, and both come back here afterwards.

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
      <Link className={navButton} href={withNext(LOGIN_PATH, pathname)}>
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
      <span className="max-w-[160px] truncate text-sm text-muted max-sm:hidden" title={name}>{name}</span>
      <button type="button" className={navButton} onClick={() => void signOutAccount()}>
        Sign out
      </button>
    </div>
  );
}
