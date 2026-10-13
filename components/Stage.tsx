'use client';

// The video with everything drawn on top of it: skeleton, message (with a spinner while the
// camera / model loads), "Watching" badge,
// the live box (which balance, hold dots, one tip) and a card after every move.
// On phones (below the sm breakpoint) the boxes are smaller and only the newest card shows,
// so the gymnast stays visible.

import type { RefObject } from 'react';
import type { LiveView, MoveCardData, StageMessage } from '@/lib/session';
import { describeMove } from '@/lib/ui/plain';
import { toneBorder, toneText } from './ui';

interface StageProps {
  stageRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  message: StageMessage | null;
  busy: boolean; // the camera / model is loading
  judging: boolean;
  live: LiveView | null;
  cards: MoveCardData[];
}

export function Stage({ stageRef, videoRef, canvasRef, message, busy, judging, live, cards }: StageProps) {
  const shown = message ?? (busy ? { title: 'Getting ready…', detail: '' } : null);
  return (
    <div ref={stageRef} className="relative aspect-video max-w-full overflow-hidden rounded-card bg-ink">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-contain" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-contain" />

      {shown && (
        <div
          className={`absolute inset-0 grid place-content-center justify-items-center gap-2 p-6 text-center text-white ${busy ? 'bg-ink/70' : ''}`}
          role="status"
        >
          {busy && <Spinner />}
          <b className="text-[clamp(20px,2.6vw,28px)]">{shown.title}</b>
          {shown.detail && <span className="text-stage-text">{shown.detail}</span>}
        </div>
      )}

      {judging && (
        <div className="absolute top-3 left-3 rounded-full bg-bad px-3 py-1.5 text-sm font-semibold text-white max-sm:top-2 max-sm:left-2 max-sm:px-2 max-sm:py-1 max-sm:text-xs">● Watching</div>
      )}

      {live && <LiveBox live={live} />}

      <div className="pointer-events-none absolute bottom-3 left-3 grid w-[min(340px,calc(100%-24px))] gap-2 max-sm:bottom-2 max-sm:left-2 max-sm:w-[min(240px,calc(100%-16px))]" aria-live="polite">
        {cards.map((card, i) => <MoveCard key={card.id} card={card} newest={i === 0} />)}
      </div>
    </div>
  );
}

/** Turning ring while something loads. Stays still for people who asked for less motion. */
function Spinner() {
  return (
    <span
      className="mb-2 h-11 w-11 rounded-full border-4 border-white/25 border-t-white motion-safe:animate-spin max-sm:h-8 max-sm:w-8 max-sm:border-[3px]"
      aria-hidden="true"
    />
  );
}

/** What the app sees right now. */
function LiveBox({ live }: { live: LiveView }) {
  return (
    <div
      className={`absolute top-3 right-3 w-[min(340px,calc(100%-24px))] rounded-xl border-l-[6px] bg-white/95 px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.18)] max-sm:top-2 max-sm:right-2 max-sm:w-[min(240px,calc(100%-110px))] max-sm:border-l-4 max-sm:px-2.5 max-sm:py-1.5 ${toneBorder[live.tone]}`}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2.5">
        <b className="text-lg max-sm:text-sm">{live.pose}</b>
        {live.showDots && (
          <span className="flex gap-[5px]" title="Hold for 1 second">
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={`h-3 w-3 rounded-full max-sm:h-2 max-sm:w-2 ${i < live.dots ? 'bg-good' : 'bg-line'}`} />
            ))}
          </span>
        )}
      </div>
      <p className="mt-1 mb-0 text-base max-sm:mt-0.5 max-sm:text-xs">{live.text}</p>
    </div>
  );
}

/** A card after every judged move ("Attitude · 0.30 points lost · Lift the knee…"). */
function MoveCard({ card, newest }: { card: MoveCardData; newest: boolean }) {
  const m = describeMove(card.event);
  return (
    <div
      className={`animate-card-in rounded-xl border-l-[6px] bg-white px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.2)] transition-[opacity,transform] duration-500 motion-reduce:animate-none motion-reduce:transition-none max-sm:border-l-4 max-sm:px-2.5 max-sm:py-1.5 ${toneBorder[m.tone]} ${
        card.leaving ? 'translate-y-1.5 opacity-0' : ''
      } ${newest ? '' : 'max-sm:hidden'}`}
    >
      <b className="block text-[17px] max-sm:text-sm">{m.name}</b>
      <span className={`font-bold max-sm:text-sm ${toneText[m.tone]}`}>{m.result}</span>
      <div className="text-sm text-muted max-sm:hidden">{m.reasons[0]?.tip ?? 'Well done!'}</div>
    </div>
  );
}
