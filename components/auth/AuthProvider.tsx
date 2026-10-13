'use client';

// Who is signed in, for the whole app. Lives in the root layout, so it survives moving between
// /login, the judging page and the tools. useAuth() reads it.

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { firebaseConfigFromProcessEnv, type FirebasePublicKey } from '@/lib/firebase/config';
import { currentAccount, watchAccount, type Account } from '@/lib/firebase/auth';

export type AuthState =
  | { status: 'setup-needed'; missing: FirebasePublicKey[] } // Firebase settings missing (see .env.example)
  | { status: 'checking' } // waiting for Firebase to say who is signed in
  | { status: 'signed-out' }
  | { status: 'signed-in'; account: Account };

interface AuthContextValue {
  state: AuthState;
  /** Re-read the account after a profile change (Firebase does not announce those). */
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function stateFor(account: Account | null): AuthState {
  return account ? { status: 'signed-in', account } : { status: 'signed-out' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [setup] = useState(firebaseConfigFromProcessEnv);
  const [state, setState] = useState<AuthState>(() =>
    setup.ok ? { status: 'checking' } : { status: 'setup-needed', missing: setup.missing },
  );

  useEffect(() => {
    if (!setup.ok) return;
    return watchAccount(
      (account) => setState(stateFor(account)),
      () => setState({ status: 'signed-out' }),
    );
  }, [setup.ok]);

  const refresh = useCallback(() => {
    if (setup.ok) setState(stateFor(currentAccount()));
  }, [setup.ok]);

  return <AuthContext.Provider value={{ state, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth() must be used inside <AuthProvider>');
  return value;
}
