'use client';

// A short clip without player buttons, like the video on the stage: a Play button in the middle
// whenever it is not playing (at the start and when it has ended: it plays again from the start), and
// a full screen button in the bottom right corner. Used for move videos (MoveMedia.tsx) and for the
// reference videos next to them in the practice results.

import { useRef, useState } from 'react';
import { useFullscreen } from './useFullscreen';

interface ClipPlayerProps {
  src: string;
  poster?: string;
  label: string; // what the video shows, for screen readers
  name: string; // the move, for the button labels
  small?: boolean; // two clips side by side: each at most 420 px instead of 520 px
}

export function ClipPlayer({ src, poster, label, name, small = false }: ClipPlayerProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const { fullscreen, stretched, enter, exit } = useFullscreen(boxRef);

  const play = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.ended) video.currentTime = 0;
    void video.play();
  };

  // One position class only ("relative" next to "fixed" would depend on the CSS order).
  const box = stretched
    ? 'fixed inset-0 z-50 rounded-none' // iPhone: cover the page
    : `relative w-fit max-w-full ${fullscreen ? '' : 'rounded-[10px]'}`;
  // Keeps the clip's shape within 520 px wide (420 px side by side) and 60% of the screen high, so a
  // portrait clip is narrower instead of taller than the screen. In full screen it fills the screen,
  // letterboxed. No % in the width limit: the box around is as wide as the video (w-fit), and a %
  // limit would be ignored when that width is worked out (the box came out wider than the video).
  // On a phone, 112 px is the room the page, the card and the list take beside the video.
  const size = fullscreen
    ? 'absolute inset-0 h-full w-full object-contain'
    : small
      ? 'block h-auto max-h-[min(60dvh,420px)] w-auto max-w-[min(420px,calc(100vw-112px))]'
      : 'block h-auto max-h-[min(60dvh,520px)] w-auto max-w-[min(520px,calc(100vw-112px))]';

  return (
    <div ref={boxRef} className={`overflow-hidden bg-stage print:hidden ${box}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        muted
        playsInline
        preload="metadata"
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className={size}
      />
      {!playing && (
        <button
          type="button"
          className="absolute inset-0 m-auto grid size-16 cursor-pointer place-items-center rounded-full border-0 bg-black/55 pl-1 text-white hover:bg-black/70"
          aria-label={`Play: ${name}`}
          onClick={play}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
          </svg>
        </button>
      )}
      <button
        type="button"
        className="absolute right-2 bottom-2 grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-black/55 text-white hover:bg-black/70"
        aria-label={fullscreen ? 'Exit full screen' : `Full screen: ${name}`}
        title={fullscreen ? 'Exit full screen' : 'Full screen'}
        onClick={() => (fullscreen ? exit() : void enter())}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path
            d={
              fullscreen
                ? 'M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3'
                : 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3'
            }
          />
        </svg>
      </button>
    </div>
  );
}
