'use client';

// A judge's score sheet on their phone while a participant performs and right after. No video.
//   top:     who, the timer, and the judge's score in big numbers ("Execution 9.40")
//   buttons: one row of big buttons: the AI's suggestion first (D +0.50, E −0.40: one tap puts all of them on
//            the sheet, another tap takes them off), then the quick buttons (-0.10 / -0.30 / -0.50 for E;
//            +0.10 … +0.50 for D)
//   AI:      the AI's suggestions arrive live; one tap adds one to the sheet, another tap takes it off
//   sheet:   every line, with ✕ and Undo
//   send:    once the performance is over ("Send score 9.40", asked once more: it can't be changed)
// The sheet is kept in this browser tab, so a reload doesn't lose the taps.

import { useCallback, useEffect, useState } from 'react';
import { submitScore, watchLive, watchMyScore } from '@/lib/firebase/competition';
import { competitionErrorText } from '@/lib/firebase/errors';
import {
  addQuick, ADDS, aiScore, aiTotal, allSuggestionsAdded, heldEstimate, QUICK_VALUES, removeItem, sheetScore, sheetTotal, signed, suggestionsFor,
  toggleAllSuggestions, toggleSuggestion, undo, type SheetItem, type Suggestion,
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
        {/* E (AI + 3) and A (4): one row of 4. D (AI + 5): 3 × 2 on a phone, one row of 6 from 640 px. */}
        <div className={`grid gap-2 ${QUICK_VALUES[role].length + (role === 'A' ? 0 : 1) === 4 ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-6'}`}>
          {role !== 'A' && (
            <AiScoreButton role={role} live={liveHere} suggestions={suggestions} items={items} onTap={() => setItems(toggleAllSuggestions(items, suggestions))} />
          )}
          {QUICK_VALUES[role].map((v) => (
            <button
              key={v}
              type="button"
              className={`${quickButton} border-[1.5px] border-line bg-card not-disabled:hover:border-accent`}
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

      <AiSuggestions role={role} live={liveHere} error={live.error} suggestions={suggestions} items={items} onToggle={(s) => setItems(toggleSuggestion(items, s))} />

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

interface AiScoreProps {
  role: Role;
  live: LiveState | null;
  suggestions: Suggestion[];
  items: SheetItem[];
  onTap: () => void;
}

/** A big button in the row under the score: the AI's score and the quick buttons share its size. */
const quickButton =
  'min-h-16 cursor-pointer rounded-card text-[22px] font-bold text-ink tabular-nums transition-transform duration-100 not-disabled:active:scale-95 max-xs:text-lg motion-reduce:transition-none';

/**
 * The AI's suggestion, first in the row of quick buttons, the same size and shown the same way: what
 * its suggestions add up to (D: +0.50, E: −0.40; the score they make is in the label). One tap puts them all on the sheet (the judge's own lines stay), another
 * takes them off. Gradient border (.ai-border in globals.css): this one is the AI's, the others the judge's.
 * While a balance is held, its estimate is already in the number (with "~"): it moves live, and the
 * move can be added once it ends.
 */
function AiScoreButton({ role, live, suggestions, items, onTap }: AiScoreProps) {
  const held = heldEstimate(role, live);
  const total = aiTotal(suggestions, held);
  const score = aiScore(role, suggestions);
  const toAdd = suggestions.filter((s) => s.addable).length;
  const added = allSuggestionsAdded(items, suggestions);
  // Like the quick buttons: +0.50 / −0.40; nothing to add is 0.00 (not −0.00). "~": a move is still held.
  const shown = total === null ? '–' : `${held !== null ? '~' : ''}${total === 0 ? '0.00' : signed(role, total)}`;
  let what: string;
  if (held !== null) what = `AI estimate ${shown}, with the move being held now. It can be added when the move ends`;
  else if (total === null || score === null) what = 'AI suggestion: shows after the first move';
  else if (toAdd === 0) what = `AI suggests ${shown}: ${role === 'D' ? 'no difficulty to add yet' : 'no points lost so far'}`;
  else if (added) what = `AI suggests ${shown} (score ${score.toFixed(2)}): all on your sheet. Tap to take them off`;
  else what = `AI suggests ${shown} (score ${score.toFixed(2)}): tap to add its ${toAdd} suggestion${toAdd === 1 ? '' : 's'} to your sheet`;
  return (
    <button
      type="button"
      aria-pressed={added}
      aria-label={what}
      title={what}
      disabled={toAdd === 0}
      onClick={onTap}
      className={`${quickButton} ai-border grid content-center justify-items-center gap-0.5 border-2 px-1 disabled:cursor-default`}
    >
      <span className="text-xs leading-none font-bold" aria-hidden="true">
        <span className="ai-text">✦</span> AI{added ? ' ✓' : ''}
      </span>
      <span className={`leading-none ${total === null ? 'text-muted' : ''}`} aria-hidden="true">{shown}</span>
    </button>
  );
}

interface AiProps {
  role: Role;
  live: LiveState | null;
  /** The AI's suggestions could not be loaded (e.g. no access). */
  error: Error | null;
  suggestions: Suggestion[];
  items: SheetItem[];
  onToggle: (s: Suggestion) => void;
}

/** The AI assistant: what it sees now, and its suggestions (one tap = on your sheet). */
function AiSuggestions({ role, live, error, suggestions, items, onToggle }: AiProps) {
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
          {error && (
            <p className="m-0 text-sm text-bad" role="alert">{`The AI's suggestions can't be loaded. ${competitionErrorText(error)}`}</p>
          )}
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
                if (!s.addable) {
                  // Judged, but nothing to add for this role: information only.
                  return (
                    <li key={s.key} className="animate-card-in rounded-xl border-[1.5px] border-dashed border-line px-3.5 py-3 motion-reduce:animate-none">
                      <span className="grid min-w-0">
                        <b className="truncate text-muted">{s.label}</b>
                        {s.detail && <span className="text-sm text-muted">{s.detail}</span>}
                      </span>
                    </li>
                  );
                }
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
