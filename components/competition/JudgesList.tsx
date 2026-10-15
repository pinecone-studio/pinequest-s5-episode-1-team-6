'use client';

// The judges who joined, live. The organizer picks each judge's role (new judges get one at once,
// see Lobby.tsx) and can remove someone who joined by mistake.

import { removeJudge, setJudgeRole } from '@/lib/firebase/competition';
import { ROLE_NAMES, ROLES, type Role } from '@/lib/competition/panel';
import type { Judge } from '@/lib/competition/types';
import { input, smallText } from '../ui';

interface JudgesListProps {
  cid: string;
  judges: Judge[];
  /** Roles can't change once the competition runs (scores are sent per role). */
  locked?: boolean;
}

export function JudgesList({ cid, judges, locked = false }: JudgesListProps) {
  if (judges.length === 0) {
    return <p className={smallText}>No judges yet. Each judge scans the QR code with their phone camera and signs in (or tries without an account).</p>;
  }
  return (
    <ol className="m-0 grid list-none gap-2 p-0">
      {judges.map((j) => (
        <li key={j.uid} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-bg px-3.5 py-2.5 animate-panel-in motion-reduce:animate-none">
          <span
            className="grid h-9 w-9 flex-none place-items-center rounded-full bg-accent-soft font-bold text-accent"
            aria-hidden="true"
          >
            {j.name.trim().charAt(0).toUpperCase() || '?'}
          </span>
          <b className="min-w-0 flex-1 truncate">{j.name}</b>
          <span className="w-[180px] flex-none max-[420px]:order-last max-[420px]:w-full">
            <select
              className={`${input} min-h-9 py-0 text-[15px]`}
              aria-label={`Role of ${j.name}`}
              value={j.role ?? ''}
              disabled={locked || j.role === null}
              onChange={(e) => void setJudgeRole(cid, j.uid, e.target.value as Role)}
            >
              {j.role === null && <option value="">Giving a role…</option>}
              {ROLES.map((r) => <option key={r} value={r}>{`${ROLE_NAMES[r]} (${r})`}</option>)}
            </select>
          </span>
          {!locked && (
            <button
              type="button"
              className="grid h-9 w-9 flex-none cursor-pointer place-items-center rounded-full border-0 bg-transparent text-muted hover:bg-card hover:text-bad"
              aria-label={`Remove ${j.name}`}
              onClick={() => {
                if (window.confirm(`Remove ${j.name} from the judges?`)) void removeJudge(cid, j.uid);
              }}
            >
              ✕
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}
