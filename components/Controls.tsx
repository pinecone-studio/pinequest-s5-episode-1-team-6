'use client';

// The one main button (Turn on camera -> Start -> Finish -> Try again), "or use a video",
// "Switch camera", "Start over" and the three steps below the video.

import type { SessionState } from '@/lib/session';
import { bigButton, ghostButton, primaryButton } from './ui';

interface ControlsProps {
  state: SessionState;
  movesCount: number;
  onMain: () => void;
  onFile: (file: File) => void;
  onReset: () => void;
  onSwitchCamera: () => void;
}

export function Controls({ state, movesCount, onMain, onFile, onReset, onSwitchCamera }: ControlsProps) {
  const { source, judging, finished, busy, cameraCount } = state;
  const label = !source ? 'Turn on camera' : judging ? 'Finish' : finished ? 'Try again' : 'Start';
  const step = !source ? 1 : !judging && !finished ? 2 : 3;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button className={`${primaryButton} ${bigButton} w-full sm:w-auto`} disabled={busy} onClick={onMain}>{label}</button>
        <label className={`font-semibold text-accent underline underline-offset-[3px] ${busy ? 'cursor-default opacity-45' : 'cursor-pointer'}`}>
          or use a video
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = '';
            }}
          />
        </label>
        {source === 'camera' && cameraCount > 1 && !judging && (
          <button className={ghostButton} disabled={busy} onClick={onSwitchCamera}>Switch camera</button>
        )}
        {source && movesCount > 0 && !judging && (
          <button className={ghostButton} onClick={onReset}>Start over</button>
        )}
      </div>
      <Steps current={step} />
    </>
  );
}

const STEPS = [
  'Turn on the camera',
  'Stand sideways, whole body in view',
  'Press Start and hold each balance for 1 second',
];

function Steps({ current }: { current: number }) {
  return (
    <ol className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-3">
      {STEPS.map((text, i) => {
        const n = i + 1;
        const done = n < current;
        const isCurrent = n === current;
        return (
          <li
            key={n}
            className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[15px] ${isCurrent ? 'bg-accent-soft text-ink' : 'bg-card text-muted'}`}
          >
            <span
              className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-sm font-bold ${
                done ? 'bg-good text-white' : isCurrent ? 'bg-accent text-white' : 'bg-line text-muted'
              }`}
            >
              {done ? '✓' : n}
            </span>
            {text}
          </li>
        );
      })}
    </ol>
  );
}
