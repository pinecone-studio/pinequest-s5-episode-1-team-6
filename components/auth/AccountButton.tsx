'use client';

// Who is signed in, and Sign out. For page headers inside <RequireAuth>.

import { signOutAccount } from '@/lib/firebase/auth';
import { useAuth } from './AuthProvider';
import { ghostButton, smallText } from '../ui';

export function AccountButton() {
  const { state } = useAuth();
  if (state.status !== 'signed-in') return null;
  const { name } = state.account;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`${smallText} max-w-[200px] truncate max-sm:hidden`} title={name}>{name}</span>
      <button type="button" className={ghostButton} onClick={() => void signOutAccount()}>
        Sign out
      </button>
    </div>
  );
}
