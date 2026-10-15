'use client';

// The organizer's breakdown of one participant's result: per role, every judge's score (the highest
// and lowest left out once a role has 4 or more judges), penalties, the final, and each judge's sheet
// (which lines came from the AI). Only on the organizer's page, never on the leaderboard.

import { useCallback } from 'react';
import { watchScores } from '@/lib/firebase/competition';
import { competitionErrorText } from '@/lib/firebase/errors';
import { panelScore, ROLE_NAMES, ROLES } from '@/lib/competition/panel';
import { ADDS, signed } from '@/lib/competition/judgeSheet';
import type { Judge, JudgeScore, Participant } from '@/lib/competition/types';
import { smallText } from '../ui';
import { useWatch } from './useWatch';

export function ParticipantDetail({ cid, participant: p, judges }: { cid: string; participant: Participant; judges: Judge[] }) {
  const scores = useWatch(useCallback(
    (onChange: (s: JudgeScore[]) => void, onError: (e: Error) => void) => watchScores(cid, p.id, onChange, onError), [cid, p.id]));
  if (scores.error) return <p className="m-0 text-sm text-bad">{competitionErrorText(scores.error)}</p>;
  if (!scores.value) return <p className={smallText} role="status">Loading…</p>;
  const nameOf = (uid: string) => judges.find((j) => j.uid === uid)?.name ?? 'A judge who left';
  const r = p.result;

  return (
    <div className="grid gap-3 border-t border-line pt-3">
      {ROLES.map((role) => {
        const mine = scores.value!.filter((s) => s.role === role);
        const panel = panelScore(mine.map((s) => s.value));
        return (
          <div key={role} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <b className="text-[15px]">{`${ROLE_NAMES[role]} (${role})`}</b>
              <b className="tabular-nums">{panel.score === null ? '–' : panel.score.toFixed(3)}</b>
            </div>
            {mine.length === 0 && <p className={smallText}>No score.</p>}
            {mine.map((s, i) => {
              const left = panel.dropped.includes(i);
              return (
                <details key={s.judgeUid} className="rounded-lg bg-card px-3 py-1.5 text-sm">
                  <summary className="flex items-center justify-between gap-2 font-normal">
                    <span className="min-w-0 truncate">{nameOf(s.judgeUid)}</span>
                    <span className={`tabular-nums ${left ? 'text-muted line-through' : 'font-semibold'}`}>
                      {s.value.toFixed(2)}
                      {left && <span className="ml-1.5 text-xs no-underline">left out</span>}
                    </span>
                  </summary>
                  {s.items.length === 0 ? (
                    <p className={`${smallText} mt-1`}>{ADDS[role] ? 'No difficulties on the sheet.' : 'No deductions on the sheet.'}</p>
                  ) : (
                    <ul className="m-0 mt-1 grid list-none gap-0.5 p-0 text-muted">
                      {s.items.map((it, k) => (
                        <li key={k} className="flex justify-between gap-2">
                          <span className="min-w-0 truncate">{it.label}{it.fromAi && <small className="ml-1 text-accent">AI</small>}</span>
                          <span className="tabular-nums">{signed(role, it.value)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              );
            })}
          </div>
        );
      })}
      {r && (
        <p className="m-0 flex flex-wrap justify-between gap-2 border-t border-line pt-2 text-[15px]">
          <span className="text-muted">{`${r.D.toFixed(3)} + ${r.A.toFixed(3)} + ${r.E.toFixed(3)} − ${r.penalties.toFixed(2)} penalties`}</span>
          <b className="text-accent tabular-nums">{r.final.toFixed(3)}</b>
        </p>
      )}
    </div>
  );
}
