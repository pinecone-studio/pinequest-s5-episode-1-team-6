'use client';

// The spectators' leaderboard (/compete/board?c=<id>): the organizer opens it on a second screen or a
// projector. Live, without the camera. Only places, names and totals: who gave which score and
// where points were lost stay on the organizer's page.

import { useCallback, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { watchCompetition, watchParticipants } from '@/lib/firebase/competition';
import { competitionErrorText } from '@/lib/firebase/errors';
import { leaderboard } from '@/lib/competition/ranking';
import type { Competition, Participant } from '@/lib/competition/types';
import { useFullscreen } from '../useFullscreen';
import { ghostButton } from '../ui';
import { StatusLine } from './CompetitionShell';
import { useWatch } from './useWatch';

export function LeaderboardPage() {
  const cid = useSearchParams().get('c');
  if (!cid) return <Frame><StatusLine error>This link has no competition. Open the leaderboard from the competition page.</StatusLine></Frame>;
  return <Board key={cid} cid={cid} />;
}

function Frame({ children }: { children: ReactNode }) {
  return <main className="mx-auto grid w-full max-w-[1200px] gap-6 px-[clamp(16px,4vw,40px)] pt-8 pb-12">{children}</main>;
}

function Board({ cid }: { cid: string }) {
  const competition = useWatch(useCallback(
    (onChange: (c: Competition | null) => void, onError: (e: Error) => void) => watchCompetition(cid, onChange, onError), [cid]));
  const participants = useWatch(useCallback(
    (onChange: (p: Participant[]) => void, onError: (e: Error) => void) => watchParticipants(cid, onChange, onError), [cid]));
  const boardRef = useRef<HTMLDivElement>(null);
  const { fullscreen, stretched, enter, exit } = useFullscreen(boardRef);

  const error = competition.error ?? participants.error;
  if (error) return <Frame><StatusLine error>{competitionErrorText(error)}</StatusLine></Frame>;
  if (!competition.value || !participants.value) return <Frame><StatusLine>Loading…</StatusLine></Frame>;

  const c = competition.value;
  const board = leaderboard(participants.value);
  const finished = c.status === 'finished';

  return (
    <div
      ref={boardRef}
      className={`min-h-dvh bg-bg text-ink ${stretched ? 'fixed inset-0 z-50 overflow-y-auto' : ''}`}
    >
      <div className="sport-stripe h-1.5" />
      <div className="mx-auto grid w-full max-w-[1200px] gap-[clamp(16px,3vh,32px)] px-[clamp(16px,4vw,48px)] py-[clamp(20px,4vh,48px)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <p className="m-0 text-[clamp(13px,1.4vw,18px)] font-semibold tracking-[0.18em] text-muted uppercase">
              {finished ? 'Final ranking' : 'Live results'}
            </p>
            <h1 className="m-0 font-display text-[clamp(32px,5vw,72px)] leading-none">{c.name}</h1>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            {!fullscreen && <Link href={`/compete?c=${encodeURIComponent(cid)}`} className={`${ghostButton} no-underline`}>Back</Link>}
            <button type="button" className={ghostButton} onClick={() => (fullscreen ? exit() : void enter())}>
              {fullscreen ? 'Exit full screen' : 'Full screen'}
            </button>
          </div>
        </header>

        {board.now && !finished && (
          <p className="m-0 flex items-center gap-3 rounded-card bg-accent-soft px-[clamp(16px,2vw,28px)] py-[clamp(10px,1.6vh,18px)] text-[clamp(18px,2.2vw,30px)]" aria-live="polite">
            <span className="h-3 w-3 flex-none animate-pulse rounded-full bg-bad motion-reduce:animate-none" aria-hidden="true" />
            <span className="min-w-0">
              <span className="text-muted">{board.now.status === 'performing' ? 'Performing now: ' : 'Judges are scoring: '}</span>
              <b>{board.now.name}</b>
            </span>
          </p>
        )}

        {board.ranked.length === 0 ? (
          <p className="m-0 rounded-card bg-card px-6 py-10 text-center text-[clamp(18px,2vw,28px)] text-muted">
            The first results appear here as soon as the judges have scored.
          </p>
        ) : (
          <ol className="m-0 grid list-none gap-[clamp(6px,1vh,12px)] p-0" aria-live="polite">
            {board.ranked.map((r) => (
              <li
                key={r.id}
                className={`flex items-center gap-[clamp(12px,2vw,28px)] rounded-card px-[clamp(16px,2.4vw,32px)] py-[clamp(10px,1.8vh,22px)] animate-card-in motion-reduce:animate-none ${
                  r.rank === 1 ? 'bg-accent text-on-fill' : 'bg-card'
                }`}
              >
                <span className={`w-[2.2ch] flex-none text-right font-display text-[clamp(28px,4vw,56px)] leading-none tabular-nums ${r.rank === 1 ? '' : 'text-muted'}`}>
                  {r.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-[clamp(20px,2.8vw,40px)] font-semibold">{r.name}</span>
                <span className="flex-none font-display text-[clamp(28px,4vw,56px)] leading-none tabular-nums">{r.final.toFixed(3)}</span>
              </li>
            ))}
          </ol>
        )}

        {board.waiting.length > 0 && !finished && (
          <p className="m-0 text-[clamp(15px,1.6vw,22px)] text-muted">
            <b className="text-ink">Still to perform: </b>
            {board.waiting.map((w) => w.name).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}
