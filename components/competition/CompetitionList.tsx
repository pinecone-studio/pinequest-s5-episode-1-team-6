'use client';

// /compete without an id: the organizer's competitions, newest first, and a form for a new one.

import { useCallback, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createCompetition, watchMyCompetitions } from '@/lib/firebase/competition';
import { competitionErrorText } from '@/lib/firebase/errors';
import type { Competition, CompetitionStatus } from '@/lib/competition/types';
import { chip, input, primaryButton, smallText } from '../ui';
import { card, CardTitle, CompetitionShell, StatusLine } from './CompetitionShell';
import { useWatch } from './useWatch';

export const STATUS_TEXT: Record<CompetitionStatus, { text: string; tone: keyof typeof chip }> = {
  lobby: { text: 'Getting ready', tone: 'warn' },
  running: { text: 'Running', tone: 'good' },
  finished: { text: 'Finished', tone: 'muted' },
};

export function CompetitionList() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const watch = useCallback(
    (onChange: (list: Competition[]) => void, onError: (e: Error) => void) => watchMyCompetitions(onChange, onError),
    [],
  );
  const { value: competitions, error } = useWatch(watch);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setCreateError(null);
    try {
      const id = await createCompetition(name);
      router.push(`/compete?c=${encodeURIComponent(id)}`);
    } catch (err) {
      setCreateError(competitionErrorText(err));
      setBusy(false);
    }
  }

  return (
    <CompetitionShell
      crumb="Competition"
      title="Competition"
      intro="Run a rhythmic gymnastics competition with one judge or more. Judges join with their phones by scanning a QR code; the AI camera helps them while each gymnast performs."
    >
      <form className={card} onSubmit={(e) => void create(e)}>
        <CardTitle>New competition</CardTitle>
        <label className="grid gap-1 text-sm font-semibold">
          Name
          <input
            className={input}
            value={name}
            maxLength={80}
            placeholder="For example: City Cup 2026"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {createError && <p className="m-0 text-sm text-bad" role="alert">{createError}</p>}
        <button className={`${primaryButton} w-fit`} type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create competition'}
        </button>
      </form>

      <section className="grid gap-3" aria-labelledby="my-competitions">
        <h2 id="my-competitions" className="m-0 font-display text-[22px] leading-tight">Your competitions</h2>
        {error && <StatusLine error>{competitionErrorText(error)}</StatusLine>}
        {!error && competitions === undefined && <StatusLine>Loading…</StatusLine>}
        {competitions?.length === 0 && <p className={smallText}>None yet. Create one above.</p>}
        {competitions && competitions.length > 0 && (
          <ol className="m-0 grid list-none gap-2.5 p-0">
            {competitions.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/compete?c=${encodeURIComponent(c.id)}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3.5 text-ink no-underline transition-colors duration-150 hover:bg-accent-soft motion-reduce:transition-none"
                >
                  <span className="grid min-w-0">
                    <b className="truncate text-[17px]">{c.name}</b>
                    <span className="text-sm text-muted">
                      {new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </span>
                  <span className={`flex-none rounded-full px-2.5 py-[3px] text-sm font-bold ${chip[STATUS_TEXT[c.status].tone]}`}>
                    {STATUS_TEXT[c.status].text}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </CompetitionShell>
  );
}
