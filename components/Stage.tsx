'use client';

// The video with everything drawn on top of it: skeleton, message, "Watching" badge,
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
  judging: boolean;
  live: LiveView | null;
  cards: MoveCardData[];
}

export function Stage({ stageRef, videoRef, canvasRef, message, judging, live, cards }: StageProps) {
  return (
    <div ref={stageRef} className="relative aspect-video max-w-full overflow-hidden rounded-card bg-stage">
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-contain" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-contain" />

      {message && (
        <div className="absolute inset-0 grid place-content-center gap-2 p-6 text-center text-white">
          <b className="text-[clamp(20px,2.6vw,28px)]">{message.title}</b>
          <span className="text-stage-text">{message.detail}</span>
        </div>
      )}

      {judging && (
        <div className="absolute top-3 left-3 rounded-full bg-bad px-3 py-1.5 text-sm font-semibold text-on-fill max-sm:top-2 max-sm:left-2 max-sm:px-2 max-sm:py-1 max-sm:text-xs">● Watching</div>
      )}

      {live && <LiveBox live={live} />}

      <div className="pointer-events-none absolute bottom-3 left-3 grid w-[min(340px,calc(100%-24px))] gap-2 max-sm:bottom-2 max-sm:left-2 max-sm:w-[min(240px,calc(100%-16px))]" aria-live="polite">
        {cards.map((card, i) => <MoveCard key={card.id} card={card} newest={i === 0} />)}
      </div>
    </div>
  );
}

/** What the app sees right now. */
function LiveBox({ live }: { live: LiveView }) {
  return (
    <div
      className={`absolute top-3 right-3 w-[min(340px,calc(100%-24px))] rounded-xl border-l-[6px] bg-overlay/95 px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.18)] max-sm:top-2 max-sm:right-2 max-sm:w-[min(240px,calc(100%-110px))] max-sm:border-l-4 max-sm:px-2.5 max-sm:py-1.5 ${toneBorder[live.tone]}`}
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
      className={`animate-card-in rounded-xl border-l-[6px] bg-overlay px-4 py-3 shadow-[0_6px_24px_rgba(0,0,0,0.2)] transition-[opacity,transform] duration-500 motion-reduce:animate-none motion-reduce:transition-none max-sm:border-l-4 max-sm:px-2.5 max-sm:py-1.5 ${toneBorder[m.tone]} ${
        card.leaving ? 'translate-y-1.5 opacity-0' : ''
      } ${newest ? '' : 'max-sm:hidden'}`}
    >
      <b className="block text-[17px] max-sm:text-sm">{m.name}</b>
      <span className={`font-bold max-sm:text-sm ${toneText[m.tone]}`}>{m.result}</span>
      <div className="text-sm text-muted max-sm:hidden">{m.reasons[0]?.tip ?? 'Well done!'}</div>
    </div>
  );
}
