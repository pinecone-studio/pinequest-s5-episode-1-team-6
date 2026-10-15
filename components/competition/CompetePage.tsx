'use client';

// The organizer's side of competition mode (/compete).
//   /compete          your competitions + a new one
//   /compete?c=<id>   one competition: Lobby (judges join, participants) -> Running -> Finished
// The id is a query parameter because the site is static (no /compete/[id] pages).

import { useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { watchCompetition } from '@/lib/firebase/competition';
import { competitionErrorText } from '@/lib/firebase/errors';
import type { Competition } from '@/lib/competition/types';
import { useAuth } from '../auth/AuthProvider';
import { CompetitionList } from './CompetitionList';
import { CompetitionShell, StatusLine } from './CompetitionShell';
import { Lobby } from './Lobby';
import { useWatch } from './useWatch';

export function CompetePage() {
  const cid = useSearchParams().get('c');
  return cid ? <CompetitionDashboard key={cid} cid={cid} /> : <CompetitionList />;
}

function CompetitionDashboard({ cid }: { cid: string }) {
  const { state } = useAuth();
  const uid = state.status === 'signed-in' ? state.account.uid : null;
  const watch = useCallback(
    (onChange: (c: Competition | null) => void, onError: (e: Error) => void) => watchCompetition(cid, onChange, onError),
    [cid],
  );
  const { value: competition, error } = useWatch(watch);

  if (error || competition === null) {
    return (
      <CompetitionShell crumb="Competition" title="Competition">
        <StatusLine error>{error ? competitionErrorText(error) : 'This competition doesn\'t exist any more.'}</StatusLine>
        <Link className="font-semibold text-accent" href="/compete">← Your competitions</Link>
      </CompetitionShell>
    );
  }
  if (competition === undefined) {
    return (
      <CompetitionShell crumb="Competition" title="Competition">
        <StatusLine>Loading…</StatusLine>
      </CompetitionShell>
    );
  }
  if (competition.ownerUid !== uid) {
    return (
      <CompetitionShell crumb="Competition" title={competition.name}>
        <StatusLine>Only the organizer can open this page. Judges join with the QR code from the organizer.</StatusLine>
      </CompetitionShell>
    );
  }
  if (competition.status === 'lobby') return <Lobby competition={competition} />;
  return (
    <CompetitionShell crumb="Competition" title={competition.name}>
      <StatusLine>{competition.status === 'finished' ? 'This competition has finished.' : 'The competition is running.'}</StatusLine>
    </CompetitionShell>
  );
}
