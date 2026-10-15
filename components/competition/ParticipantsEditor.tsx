'use client';

// How many participants, and their names. New participants are "Participant 1, 2, …" until the
// organizer types a real name. Works before and after the judges have joined.

import { useRef, useState, type KeyboardEvent } from 'react';
import { renameParticipant, setParticipantCount } from '@/lib/firebase/competition';
import { defaultParticipantName } from '@/lib/competition/panel';
import type { Participant } from '@/lib/competition/types';
import { input, smallText } from '../ui';

const MAX_PARTICIPANTS = 99;

export function ParticipantsEditor({ cid, participants }: { cid: string; participants: Participant[] }) {
  const count = participants.length;
  const setCount = (n: number) => void setParticipantCount(cid, participants, Math.min(MAX_PARTICIPANTS, Math.max(0, n)));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[15px] font-semibold" id="participant-count">How many participants?</span>
        <div className="flex items-center gap-1.5" role="group" aria-labelledby="participant-count">
          <StepButton label="One fewer participant" disabled={count === 0} onClick={() => setCount(count - 1)}>−</StepButton>
          <CountInput key={count} count={count} onCommit={setCount} />
          <StepButton label="One more participant" disabled={count >= MAX_PARTICIPANTS} onClick={() => setCount(count + 1)}>+</StepButton>
        </div>
      </div>
      {count === 0 ? (
        <p className={smallText}>Add the participants in their starting order. You can rename them now or later.</p>
      ) : (
        <ol className="m-0 grid list-none gap-2 p-0">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              <span className="w-7 flex-none text-right font-bold text-muted tabular-nums">{p.order}.</span>
              <NameInput
                key={p.name}
                name={p.name}
                placeholder={defaultParticipantName(p.order)}
                onCommit={(name) => void renameParticipant(cid, p.id, name || defaultParticipantName(p.order))}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StepButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      className="grid h-11 w-11 flex-none cursor-pointer place-items-center rounded-full border-[1.5px] border-line bg-bg text-xl font-bold text-ink not-disabled:hover:border-accent not-disabled:hover:text-accent disabled:cursor-default disabled:opacity-45"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Typed count, applied when you leave the field or press Enter. */
function CountInput({ count, onCommit }: { count: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(count));
  const commit = () => {
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n) && n !== count) onCommit(n);
    else setDraft(String(count));
  };
  return (
    <span className="w-20 flex-none">
      <input
        className={`${input} text-center tabular-nums`}
        type="number"
        inputMode="numeric"
        min={0}
        max={MAX_PARTICIPANTS}
        aria-label="Number of participants"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
      />
    </span>
  );
}

/** A participant's name, saved when you leave the field or press Enter; Escape undoes the typing. */
export function NameInput({ name, placeholder, onCommit }: { name: string; placeholder: string; onCommit: (name: string) => void }) {
  const [draft, setDraft] = useState(name);
  const cancelled = useRef(false);
  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const clean = draft.trim();
    if (clean !== name) onCommit(clean);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    if (e.key === 'Escape') {
      cancelled.current = true;
      setDraft(name);
      e.currentTarget.blur();
    }
  };
  return (
    <input
      className={input}
      value={draft}
      maxLength={60}
      placeholder={placeholder}
      aria-label={`Name of ${placeholder}`}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKey}
    />
  );
}
