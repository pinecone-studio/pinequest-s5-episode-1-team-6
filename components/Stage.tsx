'use client';

// The video with everything drawn on top of it: skeleton, message (with a spinner while the
// camera / model loads, and a bar while the model downloads), "Watching" badge,
// the live box (which balance, hold dots, one tip) and a card after every move.
// On phones (narrow, or turned sideways: the compact variant in globals.css) the boxes are smaller
// and only the newest card shows, so the gymnast stays visible. On a phone turned sideways the video
// fits the screen height and the page scrolls to it when the camera starts.
// "Full screen" shows all of it on the whole screen (useFullscreen.ts); there the main button
// (Start / Finish) is on the video too (also on a phone turned sideways, where the button below
// the video is off the screen), so nobody has to leave full screen or scroll to press it. When judging
// stops (Finish, or the end of a video) full screen closes, so the results can be seen.

import { useEffect, useRef, type RefObject } from 'react';
import type { LiveView, MoveCardData, Source, StageMessage } from '@/lib/session';
import { describeMove } from '@/lib/ui/plain';
import { useFullscreen } from './useFullscreen';
import { primaryButton, toneBorder, toneText } from './ui';

interface StageProps {
  stageRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  message: StageMessage | null;
  busy: boolean; // the camera / model is loading
  judging: boolean;
  live: LiveView | null;
  cards: MoveCardData[];
  source: Source; // camera, video file or nothing
  main: { label: string; onClick: () => void }; // the main button, for full screen
}

export function Stage({ stageRef, videoRef, canvasRef, message, busy, judging, live, cards, source, main }: StageProps) {
  const shown = message ?? (busy ? { title: 'Getting ready…', detail: '' } : null);
  const { fullscreen, stretched, enter, exit } = useFullscreen(stageRef);
  // Phone turned sideways: bring the whole video into view when the camera or a video starts.
  useEffect(() => {
    if (source && window.matchMedia('(max-height: 500px)').matches) {
      stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [source, stageRef]);

  const wasJudging = useRef(judging);
  useEffect(() => {
    if (wasJudging.current && !judging) exit(); // the results open below the video
    wasJudging.current = judging;
  }, [judging, exit]);
  // Only one position class: with both "relative" and "fixed", the CSS order decides and "fixed" can lose.
  // The stage has the video's shape (session.ts sets --video-ar). Its height stays within the screen,
  // minus room for the header and the main button (at least 320 px): a portrait video gets a narrower,
  // centered stage instead of one taller than the screen. Landscape videos are limited by the width.
  const size = stretched
    ? 'fixed inset-0 z-50 h-dvh w-screen max-w-none rounded-none' // iPhone: cover the page
    : `relative mx-auto aspect-video w-[min(100%,calc(max(320px,calc(100dvh_-_250px))*var(--video-ar,1.7778)))] max-w-full short:h-[calc(100dvh-16px)] short:w-full ${fullscreen ? 'rounded-none' : 'rounded-card'}`;
  return (
    <div ref={stageRef} className={`@container/stage overflow-hidden bg-stage ${size}`}>
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-contain" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-contain" />

      {shown && (
        <div
          className={`absolute inset-0 grid place-content-center justify-items-center gap-2 p-6 text-center text-white ${busy ? 'bg-stage/60' : ''}`}
          role="status"
        >
          {busy && <Spinner />}
          <b className="text-[clamp(20px,2.6vw,28px)]">{shown.title}</b>
          {shown.progress !== undefined && <ProgressBar value={shown.progress} />}
          {shown.detail && <span className="text-stage-text">{shown.detail}</span>}
        </div>
      )}

      {judging && (
        <div className="absolute top-3 left-3 rounded-full bg-bad px-3 py-1.5 text-sm font-semibold text-on-fill compact:top-2 compact:left-2 compact:px-2 compact:py-1 compact:text-xs">● Watching</div>
      )}

      {live && <LiveBox live={live} />}

      {source && (
        // A video file shows the player's own buttons along the bottom: stay above them.
        <div className={`absolute right-3 flex items-center gap-2 compact:right-2 ${source === 'file' ? 'bottom-14' : 'bottom-3 compact:bottom-2'}`}>
          {/* Shown in full screen and on short screens. The wrapper does the hiding: "hidden" next to the
              button's own "inline-flex" would depend on the CSS order. */}
          <span className={fullscreen ? 'contents' : 'hidden short:contents'}>
            <button type="button" className={`${primaryButton} min-h-11 px-5`} disabled={busy} onClick={main.onClick}>
              {main.label}
            </button>
          </span>
          <button
            type="button"
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-0 bg-black/60 px-3.5 text-sm font-semibold text-white hover:bg-black/75"
            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={() => (fullscreen ? exit() : void enter())}
          >
            <FullscreenIcon exit={fullscreen} />
            <span className="compact:hidden">{fullscreen ? 'Exit full screen' : 'Full screen'}</span>
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 grid w-[min(340px,calc(100%-24px))] gap-2 compact:bottom-2 compact:left-2 compact:w-[min(240px,calc(100%-16px))]" aria-live="polite">
        {cards.map((card, i) => <MoveCard key={card.id} card={card} newest={i === 0} />)}
      </div>
    </div>
  );
}

/** Four corners pointing out (full screen) or in (exit). */
function FullscreenIcon({ exit }: { exit: boolean }) {
  const d = exit
    ? 'M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3'
    : 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Turning ring while something loads. Stays still for people who asked for less motion. */
function Spinner() {
  return (
    <span
      className="mb-2 h-11 w-11 rounded-full border-4 border-white/25 border-t-white motion-safe:animate-spin compact:h-8 compact:w-8 compact:border-[3px]"
      aria-hidden="true"
    />
  );
}

/** How much of the model has downloaded. The video area is dark in both themes, so white works. */
function ProgressBar({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div
      className="mt-1 h-2 w-[min(280px,60vw)] overflow-hidden rounded-full bg-white/25"
      role="progressbar"
      aria-label="Pose model download"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className="h-full rounded-full bg-white transition-[width] duration-300 motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** What the app sees right now. */
function LiveBox({ live }: { live: LiveView }) {
  return (
    <div
      className={`absolute top-3 right-3 w-[min(340px,calc(100%-24px))] rounded-xl border-l-[6px] bg-overlay/95 px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.18)] compact:top-2 compact:right-2 compact:w-[min(240px,calc(100%-110px))] compact:border-l-4 compact:px-2.5 compact:py-1.5 ${toneBorder[live.tone]}`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2.5">
        <b className="text-lg compact:text-sm">{live.pose}</b>
        {live.showDots && (
          <span className="flex gap-[5px]" title="Hold for 1 second">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={`h-3 w-3 rounded-full compact:h-2 compact:w-2 ${i < live.dots ? 'bg-good' : 'bg-line'}`} />
            ))}
          </span>
        )}
      </div>
      <p className="mt-1 mb-0 text-base compact:mt-0.5 compact:text-xs">{live.text}</p>
    </div>
  );
}

/** A card after every judged move ("Attitude · 0.30 points lost · Lift the knee…"). */
function MoveCard({ card, newest }: { card: MoveCardData; newest: boolean }) {
  const m = describeMove(card.event);
  return (
    <div
      className={`animate-card-in rounded-xl border-l-[6px] bg-overlay px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.2)] transition-[opacity,transform] duration-500 motion-reduce:animate-none motion-reduce:transition-none compact:border-l-4 compact:px-2.5 compact:py-1.5 ${toneBorder[m.tone]} ${
        card.leaving ? 'translate-y-1.5 opacity-0' : ''
      } ${newest ? '' : 'compact:hidden'}`}
    >
      <b className="block text-[17px] compact:text-sm">{m.name}</b>
      <span className={`font-bold compact:text-sm ${toneText[m.tone]}`}>{m.result}</span>
      <div className="text-sm text-muted compact:hidden">{m.reasons[0]?.tip ?? 'Well done!'}</div>
    </div>
  );
}
