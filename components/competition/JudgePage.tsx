'use client';

// The judge's side of competition mode (/judge?c=<id>&k=<key>, the link in the organizer's QR code).
// Made for a phone; no video here, only what a judge needs.
//   1. Join: your name (the account's name is filled in) -> Join as a judge.
//   2. Wait: your role, and what happens next ("Waiting for the organizer to start…").
//   3. Score: while a participant performs and right after (ScoreSheet, step 6).

import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { joinCompetition, watchCompetition, watchMyJudge } from '@/lib/firebase/competition';
import { competitionErrorText, firebaseErrorCode } from '@/lib/firebase/errors';
import { ROLE_NAMES, type Role } from '@/lib/competition/panel';
import type { Competition, Judge } from '@/lib/competition/types';
import { useAuth } from '../auth/AuthProvider';
import { bigButton, input, primaryButton, smallText } from '../ui';
import { card, CompetitionShell, StatusLine } from './CompetitionShell';
import { useWatch } from './useWatch';

export function JudgePage() {
  const params = useSearchParams();
  const cid = params.get('c');
  const key = params.get('k');
  if (!cid || !key) {
    return (
      <JudgeShell>
        <StatusLine error>This link is not complete. Scan the organizer&apos;s QR code again.</StatusLine>
      </JudgeShell>
    );
  }
  return <JudgeFlow key={cid} cid={cid} joinKey={key} />;
}

function JudgeShell({ title = 'Judge', children }: { title?: string; children: ReactNode }) {
  return <CompetitionShell crumb="Judge" title={title}>{children}</CompetitionShell>;
}

function JudgeFlow({ cid, joinKey }: { cid: string; joinKey: string }) {
  const me = useWatch(useCallback(
    (onChange: (j: Judge | null) => void, onError: (e: Error) => void) => watchMyJudge(cid, onChange, onError),
    [cid],
  ));
  if (me.error) return <JudgeShell><StatusLine error>{competitionErrorText(me.error)}</StatusLine></JudgeShell>;
  if (me.value === undefined) return <JudgeShell><StatusLine>Loading…</StatusLine></JudgeShell>;
  if (me.value === null) return <JoinForm cid={cid} joinKey={joinKey} />;
  return <Joined cid={cid} me={me.value} />;
}

/** Your name, then Join. The account's name is filled in (a guest types one). */
function JoinForm({ cid, joinKey }: { cid: string; joinKey: string }) {
  const { state } = useAuth();
  const account = state.status === 'signed-in' ? state.account : null;
  const [name, setName] = useState(account && !account.isGuest ? account.name : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function join(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await joinCompetition(cid, joinKey, name);
    } catch (err) {
      setError(firebaseErrorCode(err) === 'permission-denied'
        ? 'This QR code doesn\'t work (any more). Ask the organizer to show it again.'
        : competitionErrorText(err));
      setBusy(false);
    }
  }

  return (
    <JudgeShell title="Join as a judge">
      <form className={card} onSubmit={(e) => void join(e)}>
        <p className="m-0">The organizer will see your name and give you a role.</p>
        <label className="grid gap-1 text-sm font-semibold">
          Your name
          <input
            className={input}
            value={name}
            required
            maxLength={60}
            autoComplete="name"
            placeholder="First and last name"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {error && <p className="m-0 text-sm text-bad" role="alert">{error}</p>}
        <button className={`${primaryButton} ${bigButton} w-full`} type="submit" disabled={busy || !name.trim()}>
          {busy ? 'Joining…' : 'Join as a judge'}
        </button>
      </form>
    </JudgeShell>
  );
}

function Joined({ cid, me }: { cid: string; me: Judge }) {
  const competition = useWatch(useCallback(
    (onChange: (c: Competition | null) => void, onError: (e: Error) => void) => watchCompetition(cid, onChange, onError),
    [cid],
  ));
  const c = competition.value;
  if (competition.error) return <JudgeShell><StatusLine error>{competitionErrorText(competition.error)}</StatusLine></JudgeShell>;
  if (c === undefined) return <JudgeShell><StatusLine>Loading…</StatusLine></JudgeShell>;
  if (c === null) return <JudgeShell><StatusLine error>This competition doesn&apos;t exist any more.</StatusLine></JudgeShell>;

  return (
    <JudgeShell title={c.name}>
      <RoleCard name={me.name} role={me.role} />
      <Waiting competition={c} hasRole={me.role !== null} />
    </JudgeShell>
  );
}

/** "Saraa · You judge Difficulty (D)" */
function RoleCard({ name, role }: { name: string; role: Role | null }) {
  return (
    <div className="flex items-center gap-3.5 rounded-card bg-accent-soft px-5 py-4">
      <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-accent font-display text-2xl text-on-fill" aria-hidden="true">
        {role ?? '…'}
      </span>
      <div className="grid min-w-0">
        <b className="truncate text-[17px]">{name}</b>
        <span className="text-[15px] text-muted">
          {role ? `You judge ${ROLE_NAMES[role]} (${role})` : 'Waiting for the organizer to give you a role…'}
        </span>
      </div>
    </div>
  );
}

/** What happens now, in one big sentence. The score sheet replaces this while someone performs. */
function Waiting({ competition: c, hasRole }: { competition: Competition; hasRole: boolean }) {
  let title: string;
  let detail: string;
  if (c.status === 'finished') {
    title = 'The competition has finished.';
    detail = 'Thank you for judging!';
  } else if (c.status === 'lobby') {
    title = 'Waiting for the organizer to start the competition…';
    detail = 'Keep this page open. It changes by itself when the first participant is up.';
  } else if (c.current) {
    title = `${c.current.order}. ${c.current.name}`;
    detail = c.phase === 'performing' ? 'Performing now.' : 'The performance has finished: scoring.';
  } else {
    title = 'Waiting for the next participant…';
    detail = 'Keep this page open.';
  }
  return (
    <section className={`${card} justify-items-center py-10 text-center`} aria-live="polite">
      {c.status !== 'finished' && !c.current && <Pulse />}
      <p className="m-0 max-w-[28ch] font-display text-[26px] leading-tight">{title}</p>
      <p className={smallText}>{detail}</p>
      {!hasRole && c.status !== 'finished' && <p className={smallText}>You can score once you have a role.</p>}
    </section>
  );
}

/** A slow breathing dot: the page is live and waiting. */
function Pulse() {
  return (
    <span className="relative grid h-4 w-4 place-items-center" aria-hidden="true">
      <span className="absolute h-4 w-4 animate-ping rounded-full bg-accent/40 motion-reduce:animate-none" />
      <span className="h-2.5 w-2.5 rounded-full bg-accent" />
    </span>
  );
}
