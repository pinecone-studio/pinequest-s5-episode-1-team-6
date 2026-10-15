'use client';

// Keeps a component in step with one Firestore watch*() function from lib/firebase/competition.ts.
// Pass a watch made with useCallback (or null to watch nothing): a new watch starts empty again.

import { useEffect, useState } from 'react';

type Watch<T> = (onChange: (value: T) => void, onError: (error: Error) => void) => () => void;

export interface Watched<T> {
  /** undefined while loading (and when watching nothing). */
  value: T | undefined;
  error: Error | null;
}

export function useWatch<T>(watch: Watch<T> | null): Watched<T> {
  const [state, setState] = useState<Watched<T> & { watch: Watch<T> | null }>({ value: undefined, error: null, watch });
  useEffect(() => {
    if (!watch) return;
    return watch(
      (value) => setState({ value, error: null, watch }),
      (error) => setState({ value: undefined, error, watch }),
    );
  }, [watch]);
  return state.watch === watch ? state : { value: undefined, error: null };
}
