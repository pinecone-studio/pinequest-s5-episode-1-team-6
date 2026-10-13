'use client';

// Shows its children only to someone who is signed in; everyone else goes to /login and comes
// back here afterwards. Used once, in app/(app)/layout.tsx. The camera stays off until then.

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { loginPath } from '@/lib/ui/loginRedirect';
import { useAuth } from './AuthProvider';
import { CheckingAccount, SetupNeeded } from './AuthMessages';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === 'signed-out') router.replace(loginPath(pathname));
  }, [state.status, pathname, router]);

  if (state.status === 'setup-needed') return <SetupNeeded missing={state.missing} />;
  if (state.status !== 'signed-in') return <CheckingAccount />;
  return children;
}
