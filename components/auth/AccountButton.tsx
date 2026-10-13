'use client';

// Account buttons for page headers inside <RequireAuth>.
// Signed in: the name and Sign out. Guest: Sign in and Create account instead (a guest has nothing to
// sign out of); both pages come back here afterwards.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAccount } from '@/lib/firebase/auth';
import { LOGIN_PATH, SIGNUP_PATH, withNext } from '@/lib/ui/loginRedirect';
import { useAuth } from './AuthProvider';
import { ghostButton, secondaryButton, smallText } from '../ui';

export function AccountButton() {
  const { state } = useAuth();
  const pathname = usePathname();
  if (state.status !== 'signed-in') return null;
  const { name, isGuest } = state.account;

  if (isGuest) {
    return (
      <div className="flex min-w-0 items-center gap-2.5">
        <Link className={ghostButton} href={withNext(LOGIN_PATH, pathname)}>
          Sign in
        </Link>
        <Link className={secondaryButton} href={withNext(SIGNUP_PATH, pathname)}>
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`${smallText} max-w-[200px] truncate max-sm:hidden`} title={name}>{name}</span>
      <button type="button" className={ghostButton} onClick={() => void signOutAccount()}>
        Sign out
      </button>
    </div>
  );
}
