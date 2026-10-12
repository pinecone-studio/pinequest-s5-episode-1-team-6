// One move in the side lists. Judges also get Agree / Disagree.

import type { StoredEvent } from '@/lib/types';
import { describeMove } from '@/lib/ui/plain';
import { chip, ghostButton, smallText, toneBorder } from './ui';

interface MoveRowProps {
  event: StoredEvent;
  status: string | undefined;
  forJudge: boolean;
  onReject?: (id: number, rejected: boolean) => void;
}

export function MoveRow({ event: e, status, forJudge, onReject }: MoveRowProps) {
  const d = describeMove(e, status);
  const first = d.reasons[0];
  const pressed = 'aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white';
  return (
    <li className={`grid gap-1.5 rounded-xl border-l-[6px] bg-bg px-4 py-3.5 ${e.rejected ? 'border-l-warn opacity-50' : toneBorder[d.tone]}`}>
      <div className="flex items-baseline justify-between gap-2.5">
        <b className="text-[17px]">{d.name}</b>
        <span className={`flex-none rounded-full px-2.5 py-[3px] text-sm font-bold whitespace-nowrap ${chip[e.rejected ? 'muted' : d.tone]}`}>
          {e.rejected ? 'Not counted' : d.result}
        </span>
      </div>
      {first && (
        <>
          <p className="m-0 text-[15px]">
            {first.text}
            {first.tip && <span className="block text-sm text-muted">{first.tip}</span>}
          </p>
          {d.reasons.length > 1 && <p className={smallText}>+ {d.reasons.length - 1} more in the results</p>}
        </>
      )}
      {d.notes.slice(0, 1).map((n) => <p key={n} className="m-0 text-sm text-warn">{n}</p>)}
      {forJudge && onReject && (
        <div className="flex flex-wrap items-center gap-2">
          <button className={`${ghostButton} min-h-9 px-3.5 text-sm ${pressed}`} aria-pressed={e.reviewed && !e.rejected} aria-label={`Agree: ${d.name}`} onClick={() => onReject(e.id, false)}>Agree</button>
          <button className={`${ghostButton} min-h-9 px-3.5 text-sm ${pressed}`} aria-pressed={e.rejected} aria-label={`Disagree: ${d.name}`} onClick={() => onReject(e.id, true)}>Disagree</button>
          {!e.reviewed && <span className="text-sm font-semibold text-warn">Not checked yet</span>}
        </div>
      )}
    </li>
  );
}
