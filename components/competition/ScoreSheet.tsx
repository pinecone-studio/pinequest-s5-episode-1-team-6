'use client';

// A judge's score sheet on their phone while a participant performs and right after. No video.
//   top:     who, the timer, and the judge's score in big numbers ("Execution 9.40")
//   buttons: big quick buttons (-0.10 / -0.30 / -0.50 for E; +0.10 … +0.50 for D)
//   AI:      the AI's suggestions arrive live; one tap adds one to the sheet, another tap takes it off
//   sheet:   every line, with ✕ and Undo
//   send:    once the performance is over ("Send score 9.40", asked once more: it can't be changed)
// The sheet is kept in this browser tab, so a reload doesn't lose the taps.

import { useCallback, useEffect, useState } from 'react';
import { submitScore, watchLive, watchMyScore } from '@/lib/firebase/competition';
import { competitionErrorText } from '@/lib/firebase/errors';
import {
  addQuick, ADDS, QUICK_VALUES, removeItem, sheetScore, sheetTotal, signed, suggestionsFor, toggleSuggestion, undo,
  type SheetItem,
} from '@/lib/competition/judgeSheet';
import { ROLE_NAMES, type Role } from '@/lib/competition/panel';
import type { Competition, JudgeScore, LiveState } from '@/lib/competition/types';
import { bigButton, ghostButton, primaryButton, smallText } from '../ui';
import { card } from './CompetitionShell';
import { ConfirmDialog } from './ConfirmDialog';
import { useWatch } from './useWatch';

interface SheetProps {
  competition: Competition;
  role: Role;
}

export function ScoreSheet({ competition: c, role }: SheetProps) {
  const current = c.current!;
  const scoring = c.phase === 'scoring';
  const live = useWatch(useCallback(
    (onChange: (l: LiveState | null) => void, onError: (e: Error) => void) => watchLive(c.id, onChange, onError), [c.id]));
  const mine = useWatch(useCallback(
    (onChange: (s: JudgeScore | null) => void, onError: (e: Error) => void) => watchMyScore(c.id, current.pid, onChange, onError),
    [c.id, current.pid]));
  const [items, setItems] = useSheet(c.id, current.pid);
  const [asking, setAsking] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useWakeLock();

  const liveHere = live.value?.pid === current.pid ? live.value : null;
  const suggestions = suggestionsFor(role, liveHere);
  const score = sheetScore(role, items);

  if (mine.value) {
    return (
      <section className={`${card} justify-items-center py-10 text-center`} aria-live="polite">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-good-soft text-3xl text-good" aria-hidden="true">✓</span>
        <p className="m-0 font-display text-[26px] leading-tight">{`Sent: ${ROLE_NAMES[role]} ${mine.value.value.toFixed(2)}`}</p>
        <p className={smallText}>{`For ${current.order}. ${current.name}. Waiting for the next participant…`}</p>
      </section>
    );
  }

  async function send() {
    setAsking(false);
    setSending(true);
    setError(null);
    try {
      await submitScore(c.id, current.pid, role, score, items.map(({ label, value, fromAi }) => ({ label, value, fromAi })));
    } catch (err) {
      setError(competitionErrorText(err));
    } finally {
      setSending(false);
    }
  }

  const add = (value: number) => setItems(addQuick(items, role, value));

  return (
    <div className="grid gap-4">
      {/* Who and the score: stays at the top while scrolling the suggestions. */}
      <section className="sticky top-0 z-10 -mx-[clamp(16px,4vw,40px)] grid gap-1 border-b border-line bg-bg/95 px-[clamp(16px,4vw,40px)] py-3 backdrop-blur-sm" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <b className="min-w-0 truncate text-[17px]">{`${current.order}. ${current.name}`}</b>
          {scoring
            ? <span className="flex-none rounded-full bg-warn-soft px-2.5 py-[3px] text-sm font-bold text-warn">Send your score</span>
            : <span className="flex flex-none items-center gap-1.5 rounded-full bg-bad-soft px-2.5 py-[3px] text-sm font-bold text-bad">
                <span className="h-2 w-2 animate-pulse rounded-full bg-bad motion-reduce:animate-none" aria-hidden="true" />
                {liveHere?.startedAt ? <Clock since={liveHere.startedAt} /> : 'Performing'}
              </span>}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[15px] text-muted">{`${ROLE_NAMES[role]} (${role})`}</span>
          <b className="font-display text-[44px] leading-none text-accent tabular-nums">{score.toFixed(2)}</b>
        </div>
        <span className="text-right text-sm text-muted tabular-nums">
          {ADDS[role] ? `${items.length} difficult${items.length === 1 ? 'y' : 'ies'}` : `10.00 − ${sheetTotal(items).toFixed(2)}`}
        </span>
      </section>

      <section aria-label={ADDS[role] ? 'Add a difficulty' : 'Add a deduction'} className="grid gap-2">
        <div className={`grid gap-2 ${QUICK_VALUES[role].length > 3 ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-3'}`}>
          {QUICK_VALUES[role].map((v) => (
            <button
              key={v}
              type="button"
              className="min-h-16 cursor-pointer rounded-card border-[1.5px] border-line bg-card text-[22px] font-bold text-ink tabular-nums transition-transform duration-100 active:scale-95 not-disabled:hover:border-accent motion-reduce:transition-none"
              onClick={() => add(v)}
            >
              {signed(role, v)}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button type="button" className={`${ghostButton} min-h-9 px-3.5 text-sm`} disabled={items.length === 0} onClick={() => setItems(undo(items))}>
            Undo
          </button>
        </div>
      </section>

      <AiSuggestions role={role} live={liveHere} suggestions={suggestions} items={items} onToggle={(s) => setItems(toggleSuggestion(items, s))} />

      {items.length > 0 && (
        <section className={card} aria-labelledby="sheet-title">
          <h2 id="sheet-title" className="m-0 text-[17px] font-bold">Your sheet</h2>
          <ol className="m-0 grid list-none gap-1.5 p-0">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-2.5 rounded-xl bg-bg px-3.5 py-2">
                <span className="min-w-0 flex-1 truncate">{i.label}{i.fromAi && <small className="ml-1.5 text-accent">AI</small>}</span>
                <b className="tabular-nums">{signed(role, i.value)}</b>
                <button type="button" className="grid h-8 w-8 flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted hover:text-bad" aria-label={`Remove ${i.label} ${signed(role, i.value)}`} onClick={() => setItems(removeItem(items, i.id))}>✕</button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {error && <p className="m-0 text-sm text-bad" role="alert">{error}</p>}
      <button className={`${primaryButton} ${bigButton} w-full`} disabled={!scoring || sending} onClick={() => setAsking(true)}>
        {sending ? 'Sending…' : scoring ? `Send score ${score.toFixed(2)}` : 'Send when the performance ends'}
      </button>

      <ConfirmDialog
        open={asking}
        title={`Send ${score.toFixed(2)}?`}
        confirmLabel="Send"
        onConfirm={() => void send()}
        onCancel={() => setAsking(false)}
      >
        {`${ROLE_NAMES[role]} for ${current.order}. ${current.name}. You can't change it after sending.`}
      </ConfirmDialog>
    </div>
  );
}

interface AiProps {
  role: Role;
  live: LiveState | null;
  suggestions: ReturnType<typeof suggestionsFor>;
  items: SheetItem[];
  onToggle: (s: ReturnType<typeof suggestionsFor>[number]) => void;
}

/** The AI assistant: what it sees now, and its suggestions (one tap = on your sheet). */
function AiSuggestions({ role, live, suggestions, items, onToggle }: AiProps) {
  return (
    <section className={card} aria-labelledby="ai-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="ai-title" className="m-0 text-[17px] font-bold">AI assistant</h2>
        <span className="text-xs text-muted">It only suggests: you decide.</span>
      </div>
      {role === 'A' ? (
        <p className={smallText}>The AI doesn&apos;t judge artistry. Use the buttons above as you watch.</p>
      ) : (
        <>
          <p className="m-0 rounded-xl bg-bg px-3.5 py-2.5 text-[15px]" aria-live="polite">
            {live?.now ? <><b>{live.now.pose}</b>{` · ${live.now.text}`}</> : <span className="text-muted">Watching…</span>}
          </p>
          {suggestions.length === 0 ? (
            <p className={smallText}>
              {role === 'D' ? 'Difficulties the AI recognizes appear here.' : 'Deductions the AI measures appear here.'}
            </p>
          ) : (
            <ol className="m-0 grid list-none gap-2 p-0">
              {suggestions.map((s) => {
                const added = items.some((i) => i.id === s.key);
                return (
                  <li key={s.key} className="animate-card-in motion-reduce:animate-none">
                    <button
                      type="button"
                      aria-pressed={added}
                      onClick={() => onToggle(s)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3.5 py-3 text-left transition-colors duration-150 motion-reduce:transition-none ${
                        added ? 'border-good bg-good-soft' : 'border-line bg-bg hover:border-accent'
                      }`}
                    >
                      <span className="grid min-w-0 flex-1">
                        <b className="truncate">{s.label}</b>
                        {s.detail && <span className="text-sm text-muted">{s.detail}</span>}
                      </span>
                      <b className="flex-none tabular-nums">{signed(role, s.value)}</b>
                      <span className={`flex-none rounded-full px-2.5 py-1 text-sm font-bold ${added ? 'bg-good text-on-fill' : 'bg-accent-soft text-accent'}`}>
                        {added ? 'Added ✓' : 'Add'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

/** m:ss since the performance started. */
function Clock({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return <span className="tabular-nums">{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</span>;
}

/** The sheet lives in this tab (sessionStorage), per competition and participant. */
function useSheet(cid: string, pid: string): [SheetItem[], (items: SheetItem[]) => void] {
  const storageKey = `rhymnast.sheet.${cid}.${pid}`;
  const [items, setItemsState] = useState<SheetItem[]>(() => {
    try {
      const saved = typeof window === 'undefined' ? null : sessionStorage.getItem(storageKey);
      return saved ? (JSON.parse(saved) as SheetItem[]) : [];
    } catch {
      return [];
    }
  });
  const setItems = (next: SheetItem[]) => {
    setItemsState(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* storage blocked: fine */ }
  };
  return [items, setItems];
}

/** Keep the phone's screen on while scoring (where the browser allows it). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      navigator.wakeLock.request('screen').then((l) => {
        if (cancelled) void l.release();
        else lock = l;
      }).catch(() => undefined);
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release();
    };
  }, []);
}
