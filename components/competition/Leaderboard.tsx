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

  const error = competition.error ?? participants.error;
  if (error) return <Frame><StatusLine error>{competitionErrorText(error)}</StatusLine></Frame>;
  if (!competition.value || !participants.value) return <Frame><StatusLine>Loading…</StatusLine></Frame>;
  return <BoardView competition={competition.value} participants={participants.value} />;
}

/** Gold, silver and bronze for the first three places: the place badge and the line on the left. */
const MEDALS: Record<number, { badge: string; line: string }> = {
  1: { badge: 'bg-[#d9a520] text-[#2b1d00]', line: 'border-l-[#d9a520]' },
  2: { badge: 'bg-[#a7b0be] text-[#1c2230]', line: 'border-l-[#a7b0be]' },
  3: { badge: 'bg-[#c27a3e] text-[#2a1404]', line: 'border-l-[#c27a3e]' },
};

// Big screen first (a projector across the hall), still readable on a phone. Numbers in the body
// font: the display font's old-style figures (a low 3, 4 and 5) looked uneven in a column.
const place = 'w-[clamp(40px,4.4vw,64px)] flex-none';
const total = 'flex-none text-right font-sans font-extrabold tabular-nums';

/** The board itself, from the competition and its participants (no Firebase here). */
function BoardView({ competition: c, participants }: { competition: Competition; participants: Participant[] }) {
  const cid = c.id;
  const boardRef = useRef<HTMLDivElement>(null);
  const { fullscreen, stretched, enter, exit } = useFullscreen(boardRef);
  const board = leaderboard(participants);
  const finished = c.status === 'finished';
  const scoring = board.now?.status === 'scoring';

  return (
    <div
      ref={boardRef}
      className={`min-h-dvh bg-bg text-ink ${stretched ? 'fixed inset-0 z-50 overflow-y-auto' : ''}`}
    >
      <div className="sport-stripe h-1.5" />
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-[clamp(18px,3.4vh,36px)] px-[clamp(16px,4vw,48px)] py-[clamp(20px,4vh,48px)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid min-w-0 gap-2">
            {finished ? (
              <span className="w-fit rounded-full bg-accent-soft px-3 py-1 text-[clamp(12px,1.2vw,16px)] font-bold tracking-[0.14em] text-accent uppercase">
                Final ranking
              </span>
            ) : (
              <span className="flex w-fit items-center gap-2 rounded-full bg-bad-soft px-3 py-1 text-[clamp(12px,1.2vw,16px)] font-bold tracking-[0.14em] text-bad uppercase">
                <span className="h-2 w-2 animate-pulse rounded-full bg-bad motion-reduce:animate-none" aria-hidden="true" />
                Live
              </span>
            )}
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
          <section
            className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-card border-l-[6px] bg-card px-[clamp(16px,2.4vw,32px)] py-[clamp(12px,2vh,24px)] ${scoring ? 'border-l-warn' : 'border-l-bad'}`}
            aria-live="polite"
          >
            <div className="grid min-w-0 gap-1">
              <span className="text-[clamp(13px,1.3vw,18px)] font-bold tracking-[0.12em] text-muted uppercase">
                {scoring ? 'Judges are scoring' : 'On the floor now'}
              </span>
              <b className="truncate font-display text-[clamp(26px,3.6vw,52px)] leading-tight font-normal">{board.now.name}</b>
            </div>
            <span
              className={`flex flex-none items-center gap-2 rounded-full px-3 py-1 text-[clamp(13px,1.3vw,18px)] font-bold ${scoring ? 'bg-warn-soft text-warn' : 'bg-bad-soft text-bad'}`}
            >
              <span className={`h-2.5 w-2.5 animate-pulse rounded-full motion-reduce:animate-none ${scoring ? 'bg-warn' : 'bg-bad'}`} aria-hidden="true" />
              {scoring ? 'Score coming' : 'Performing'}
            </span>
          </section>
        )}

        {board.ranked.length === 0 ? (
          <p className="m-0 grid justify-items-center gap-3 rounded-card border-[1.5px] border-dashed border-line px-6 py-[clamp(32px,8vh,80px)] text-center text-[clamp(18px,2vw,28px)] text-muted">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
            </svg>
            The first results appear here as soon as the judges have scored.
          </p>
        ) : (
          <section className="grid grid-cols-[minmax(0,1fr)] gap-[clamp(6px,1vh,12px)]" aria-label="Ranking">
            {/* Column names, lined up with the rows below (same padding and widths). */}
            <div className="flex items-center gap-[clamp(12px,2vw,28px)] border-l-[6px] border-l-transparent px-[clamp(14px,2.2vw,30px)] text-[clamp(12px,1.1vw,15px)] font-bold tracking-[0.12em] text-muted uppercase" aria-hidden="true">
              <span className={`${place} text-center`}>Place</span>
              <span className="min-w-0 flex-1">Gymnast</span>
              <span className="flex-none">Total</span>
            </div>
            <ol className="m-0 grid list-none grid-cols-[minmax(0,1fr)] gap-[clamp(6px,1vh,12px)] p-0" aria-live="polite">
              {board.ranked.map((r) => {
                const medal = MEDALS[r.rank];
                return (
                  <li
                    key={r.id}
                    className={`flex min-w-0 items-center gap-[clamp(12px,2vw,28px)] rounded-card border-l-[6px] px-[clamp(14px,2.2vw,30px)] py-[clamp(10px,1.8vh,22px)] animate-card-in motion-reduce:animate-none ${
                      medal ? medal.line : 'border-l-transparent'
                    } ${r.rank === 1 ? 'bg-accent-soft' : 'bg-card'}`}
                  >
                    <span className={`${place} grid justify-items-center`}>
                      <span
                        className={`grid aspect-square w-[clamp(34px,3.6vw,54px)] place-items-center rounded-full font-sans text-[clamp(17px,1.9vw,28px)] font-extrabold tabular-nums ${
                          medal ? medal.badge : 'text-muted'
                        }`}
                        aria-label={`Place ${r.rank}`}
                      >
                        {r.rank}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[clamp(19px,2.6vw,38px)] font-semibold">{r.name}</span>
                    <span className={`${total} text-[clamp(24px,3.4vw,50px)] leading-none ${r.rank === 1 ? 'text-accent' : ''}`}>
                      {r.final.toFixed(3)}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {board.waiting.length > 0 && !finished && (
          <section className="grid gap-2.5" aria-labelledby="waiting-title">
            <h2 id="waiting-title" className="m-0 text-[clamp(13px,1.3vw,18px)] font-bold tracking-[0.12em] text-muted uppercase">
              Still to perform
            </h2>
            <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
              {board.waiting.map((w) => (
                <li key={w.id} className="flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-[clamp(15px,1.5vw,21px)]">
                  <span className="font-bold text-muted tabular-nums">{w.order}</span>
                  {w.name}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
