'use client';

// The one main button (Turn on camera -> Start -> Finish -> Try again), a second way in and the
// three steps below the video.
//   Camera (or nothing yet): "or use a video", "Switch camera", "Start over".
//   A video:                 "or use the camera" and "Use another video" (once it is not being judged),
//                            so there is a way back to the camera and on to the next clip.

import type { ReactNode } from 'react';
import type { SessionState } from '@/lib/session';
import { bigButton, ghostButton, primaryButton } from './ui';

interface ControlsProps {
  steps: readonly [string, string, string]; // the three steps below the video (they depend on the sport)
  state: SessionState;
  movesCount: number;
  onMain: () => void;
  onFile: (file: File) => void;
  onReset: () => void;
  onSwitchCamera: () => void;
  onUseCamera: () => void;
}

/** Text of the one main button (also shown on the video in full screen). */
export function mainButtonLabel(state: SessionState): string {
  const { source, judging, finished, busy, modelReady } = state;
  return busy ? 'Please wait…' : !source ? 'Turn on camera' : !modelReady ? 'Try loading again' : judging ? 'Finish' : finished ? 'Try again' : 'Start';
}

export function Controls({ steps, state, movesCount, onMain, onFile, onReset, onSwitchCamera, onUseCamera }: ControlsProps) {
  const { source, judging, finished, busy, cameraCount } = state;
  const label = mainButtonLabel(state);
  const step = !source ? 1 : !judging && !finished ? 2 : 3;
  const afterVideo = source === 'file' && !judging;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button className={`${primaryButton} ${bigButton} w-full sm:w-auto`} disabled={busy} onClick={onMain}>{label}</button>
        {afterVideo ? (
          <button type="button" className={`${link} ${busy ? 'cursor-default opacity-45' : 'cursor-pointer'}`} disabled={busy} onClick={onUseCamera}>
            or use the camera
          </button>
        ) : (
          <VideoPicker className={`${link} ${busy ? 'cursor-default opacity-45' : 'cursor-pointer'}`} disabled={busy} onFile={onFile}>
            or use a video
          </VideoPicker>
        )}
        {source === 'camera' && cameraCount > 1 && !judging && (
          <button className={ghostButton} disabled={busy} onClick={onSwitchCamera}>Switch camera</button>
        )}
        {afterVideo ? (
          <VideoPicker className={`${ghostButton} ${busy ? 'opacity-45' : ''}`} disabled={busy} onFile={onFile}>
            Use another video
          </VideoPicker>
        ) : (
          source && movesCount > 0 && !judging && <button className={ghostButton} onClick={onReset}>Start over</button>
        )}
      </div>
      <Steps steps={steps} current={step} />
    </>
  );
}

// A text link, but as tall as a button (44 px) so it is easy to tap on a phone.
const link = 'inline-flex min-h-11 items-center border-0 bg-transparent p-0 text-base font-semibold text-accent underline underline-offset-[3px]';

/**
 * Opens the file picker for a video. A <label> around a visually hidden file input: the input gets
 * the keyboard focus, and globals.css draws the focus ring on the label.
 */
function VideoPicker({ className, disabled, onFile, children }: { className: string; disabled: boolean; onFile: (file: File) => void; children: ReactNode }) {
  return (
    <label className={className}>
      {children}
      <input
        type="file"
        accept="video/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = ''; // picking the same file again still loads it
        }}
      />
    </label>
  );
}

function Steps({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    // Phones: stacked and a little tighter, so the moves list below is not pushed too far down.
    <ol className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 max-sm:gap-2 sm:grid-cols-3">
      {steps.map((text, i) => {
        const n = i + 1;
        const done = n < current;
        const isCurrent = n === current;
        return (
          <li
            key={n}
            className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[15px] max-sm:items-center max-sm:py-2 ${isCurrent ? 'bg-accent-soft text-ink' : 'bg-card text-muted'}`}
          >
            <span
              className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-sm font-bold ${
                done ? 'bg-good text-on-fill' : isCurrent ? 'bg-accent text-on-fill' : 'bg-line text-muted'
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
