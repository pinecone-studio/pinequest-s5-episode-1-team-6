'use client';

// Gives a component one JudgingSession (lib/session.ts) and re-renders it when the session's
// state changes. The session itself runs the camera, the pose model and the judging.

import { useState, useSyncExternalStore } from 'react';
import { JudgingSession, type SessionState } from '@/lib/session';

export function useJudgingSession(): { session: JudgingSession; state: SessionState } {
  const [session] = useState(() => new JudgingSession());
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return { session, state };
}
