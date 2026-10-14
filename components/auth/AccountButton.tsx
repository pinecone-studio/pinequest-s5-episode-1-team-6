'use client';

// Account buttons for page headers inside <RequireAuth>.
// Signed in: the name and Sign out. Guest: Sign in instead (a guest has nothing to sign out of);
// /login links to Create account, and both come back here afterwards.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAccount } from '@/lib/firebase/auth';
import { LOGIN_PATH, withNext } from '@/lib/ui/loginRedirect';
import { useAuth } from './AuthProvider';
import { ghostButton, iconOnPhone, smallText } from '../ui';

export function AccountButton() {
  const { state } = useAuth();
  const pathname = usePathname();
  if (state.status !== 'signed-in') return null;
  const { name, isGuest } = state.account;

  if (isGuest) {
    return (
      <Link className={`${ghostButton} ${iconOnPhone}`} href={withNext(LOGIN_PATH, pathname)}>
        <DoorIcon direction="in" />
        <span className="max-sm:sr-only">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`${smallText} max-w-[200px] truncate max-lg:hidden`} title={name}>{name}</span>
      <button type="button" className={`${ghostButton} ${iconOnPhone}`} onClick={() => void signOutAccount()}>
        <DoorIcon direction="out" />
        <span className="max-sm:sr-only">Sign out</span>
      </button>
    </div>
  );
}

/** Door with an arrow going in or out; shown instead of the words on phones. */
function DoorIcon({ direction }: { direction: 'in' | 'out' }) {
  const arrow = direction === 'in' ? 'M10 17l5-5-5-5M15 12H3' : 'M16 17l5-5-5-5M21 12H9';
  const door = direction === 'in' ? 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4' : 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4';
  return (
    <svg className="size-5 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={door} />
      <path d={arrow} />
    </svg>
  );
}
