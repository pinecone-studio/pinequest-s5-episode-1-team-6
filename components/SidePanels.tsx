// The two side panels: Practice (gymnast / coach) and Judge (score, artistry, agree / disagree).

import type { ScoreResult } from '@/lib/scoring';
import type { StoredEvent } from '@/lib/types';
import { MoveRow } from './MoveRow';
import { input, secondaryButton, smallText } from './ui';

/** What the judges type in. Kept as text so the inputs can be empty while typing. */
export interface JudgeForm {
  artistry: string;
  extraD: string;
  extraE: string;
  penalties: string;
}

const card = 'grid gap-3.5 rounded-card bg-card p-5';
const emptyLine = 'text-[15px] text-muted';

export function PracticePanel({ events, scores, hidden }: { events: StoredEvent[]; scores: ScoreResult; hidden: boolean }) {
  const counted = events.filter((e) => !e.rejected);
  const lost = scores.breakdown.autoE;
  const total = counted.length === 0
    ? 'No moves yet.'
    : lost === 0 ? `No points lost so far · ${counted.length} move${counted.length === 1 ? '' : 's'}`
      : `Points lost so far: ${lost.toFixed(2)}`;
  const newestFirst = [...events].reverse();

  return (
    <section className={card} id="panel-practice" role="tabpanel" aria-labelledby="tab-practice" hidden={hidden}>
      <h2 className="m-0 text-xl leading-tight font-bold">Your moves</h2>
      <p className="m-0 text-lg font-semibold">{total}</p>
      <ol className="m-0 grid list-none gap-2.5 p-0">
        {newestFirst.length
          ? newestFirst.map((e) => <MoveRow key={e.id} event={e} status={scores.status.get(e.id)} forJudge={false} />)
          : <li className={emptyLine}>Press Start, then hold a balance for 1 second.</li>}
      </ol>
      <p className={smallText}>The app watches three balances: front split, back split and attitude.</p>
    </section>
  );
}

interface JudgePanelProps {
  events: StoredEvent[];
  scores: ScoreResult;
  form: JudgeForm;
  onForm: (form: JudgeForm) => void;
  onReject: (id: number, rejected: boolean) => void;
  onReport: () => void;
  hidden: boolean;
}

export function JudgePanel({ events, scores: r, form, onForm, onReject, onReport, hidden }: JudgePanelProps) {
  const newestFirst = [...events].reverse();
  const checked = events.filter((e) => e.reviewed).length;
  const field = (key: keyof JudgeForm, label: string, extra: { max?: number; step: number }) => (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      <input
        className={input}
        type="number"
        min={0}
        inputMode="decimal"
        value={form[key]}
        onChange={(e) => onForm({ ...form, [key]: e.target.value })}
        {...extra}
      />
    </label>
  );
  const part = (label: string, value: number, note: string) => (
    <div className="grid gap-0.5 rounded-[10px] bg-bg p-2.5">
      <span className="text-sm text-muted">{label}</span>
      <b className="text-[22px] tabular-nums">{value.toFixed(2)}</b>
      <small className="text-xs text-muted">{note}</small>
    </div>
  );

  return (
    <section className={card} id="panel-judge" role="tabpanel" aria-labelledby="tab-judge" hidden={hidden}>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-semibold">Final score</span>
        <b className="text-[44px] font-bold text-accent tabular-nums">{r.final.toFixed(2)}</b>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {part('Difficulty', r.D, 'from the app')}
        {part('Execution', r.E, r.breakdown.autoE ? `from the app (−${r.breakdown.autoE.toFixed(2)})` : 'from the app')}
        {part('Artistry', r.A, 'your score')}
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {field('artistry', 'Artistry (0–10)', { max: 10, step: 0.05 })}
        {field('penalties', 'Penalties', { step: 0.05 })}
      </div>
      <details className="grid gap-2.5">
        <summary>Points the app can&apos;t see</summary>
        <p className={`${smallText} mt-2`}>For apparatus work, dance steps and other moves the app doesn&apos;t judge.</p>
        <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {field('extraD', 'Extra difficulty', { step: 0.1 })}
          {field('extraE', 'Extra execution points lost', { step: 0.1 })}
        </div>
      </details>
      <div className="flex items-baseline justify-between gap-2.5">
        <h2 className="m-0 text-xl leading-tight font-bold">Moves</h2>
        {events.length > 0 && (
          <span className={`text-sm font-semibold ${checked === events.length ? 'text-good' : 'text-muted'}`}>
            {checked} of {events.length} checked
          </span>
        )}
      </div>
      <ol className="m-0 grid list-none gap-2.5 p-0">
        {newestFirst.length
          ? newestFirst.map((e) => <MoveRow key={e.id} event={e} status={r.status.get(e.id)} forJudge onReject={onReject} />)
          : <li className={emptyLine}>Moves appear here as the gymnast performs.</li>}
      </ol>
      <button className={`${secondaryButton} w-full`} onClick={onReport}>Open full report</button>
    </section>
  );
}
