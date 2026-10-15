'use client';

// The organizer's page gives every judge who just joined a role right away: the role with the
// fewest judges (D, A, E, D, …). The organizer can change it in the lobby.

import { useEffect, useRef } from 'react';
import { setJudgeRole } from '@/lib/firebase/competition';
import { roleForNewJudge, type Role } from '@/lib/competition/panel';
import type { Judge } from '@/lib/competition/types';

export function useGiveRoles(cid: string, judges: Judge[] | undefined): void {
  const pending = useRef(new Set<string>());
  useEffect(() => {
    if (!judges) return;
    const roles = judges.map((j) => j.role).filter((r): r is Role => r !== null);
    for (const j of judges) {
      if (j.role !== null || pending.current.has(j.uid)) continue;
      const role = roleForNewJudge(roles);
      roles.push(role);
      pending.current.add(j.uid);
      void setJudgeRole(cid, j.uid, role).finally(() => pending.current.delete(j.uid));
    }
  }, [cid, judges]);
}
