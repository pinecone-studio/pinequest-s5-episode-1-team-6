'use client';

// The two sports side by side in the header: Gymnastics | Cheer. Changing sport starts a new routine
// (the session does that), so it is off while judging.

import type { KeyboardEvent } from 'react';
import { SPORTS, SPORT_TEXT, type Sport } from '@/lib/sport';
import { SportIcon } from './SportIcon';
import { chooseSport } from './useSport';

export function SportSwitch({ sport, disabled }: { sport: Sport; disabled: boolean }) {
  // Arrow keys move between the two (WAI-ARIA radio group); only the picked one is in the Tab order.
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const next = SPORTS[(SPORTS.indexOf(sport) + 1) % SPORTS.length];
    chooseSport(next);
    document.getElementById(`sport-${next}`)?.focus();
  };

  return (
    <div
      className="flex rounded-full border-[1.5px] border-line p-1"
      role="radiogroup"
      aria-label="Sport"
      title={disabled ? 'Finish judging to change sport' : undefined}
    >
      {SPORTS.map((s) => (
        <button
          key={s}
          id={`sport-${s}`}
          type="button"
          role="radio"
          aria-checked={sport === s}
          tabIndex={sport === s ? 0 : -1}
          disabled={disabled && sport !== s}
          onClick={() => chooseSport(s)}
          onKeyDown={onKey}
          className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-semibold disabled:cursor-default disabled:opacity-45 ${
            sport === s ? 'bg-accent text-on-fill' : 'bg-transparent text-muted not-disabled:hover:text-accent'
          }`}
        >
          <SportIcon sport={s} size={18} mono={sport === s} />
          {SPORT_TEXT[s].short}
        </button>
      ))}
    </div>
  );
}
