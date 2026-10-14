'use client';

// The video of one move, with the move marked on it (a mistake: red body part, tag, badge; a correct
// move: green badge; a strip showing when), and a Download button. The photo from the middle of the move is the
// video's cover picture, and what prints. Used in the results after Finish and on Saved videos.
// Like the video on the stage it has no player buttons: a Play button in the middle whenever it is
// not playing (at the start and when it has ended: it plays again from the start), and a full screen
// button in the bottom right corner.

import { useRef, useState } from 'react';
import { downloadBlob } from '@/lib/ui/download';
import { useFullscreen } from './useFullscreen';
import { ghostButton } from './ui';

export interface MoveMediaFiles {
  clip: Blob;
  clipUrl: string;
  clipName: string;
  photoUrl: string;
}

export function MoveMedia({ files, name }: { files: MoveMediaFiles; name: string }) {
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
  // Keeps the clip's shape within 520 px wide and 60% of the screen high (at most 520 px), so a portrait
  // clip is narrower instead of taller than the screen. In full screen it fills the screen, letterboxed.
  // No % in the width limit: the box around is as wide as the video (w-fit), and a % limit would be
  // ignored when that width is worked out (the box came out wider than the video, with a dark gap).
  // On a phone, 112 px is the room the page, the card and the list take beside the video.
  const size = fullscreen
    ? 'absolute inset-0 h-full w-full object-contain'
    : 'block h-auto max-h-[min(60dvh,520px)] w-auto max-w-[min(520px,calc(100vw-112px))]';

  return (
    <div className="mt-1 grid gap-2.5">
      <div ref={boxRef} className={`overflow-hidden bg-stage print:hidden ${box}`}>
        <video
          ref={videoRef}
          src={files.clipUrl}
          poster={files.photoUrl}
          muted
          playsInline
          preload="metadata"
          aria-label={`Video of ${name}. Anything that lost points is marked in red.`}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          className={size}
        />
        {!playing && (
          <button
            type="button"
            className="absolute inset-0 m-auto grid size-16 cursor-pointer place-items-center rounded-full border-0 bg-black/55 pl-1 text-white hover:bg-black/70"
            aria-label={`Play the video of ${name}`}
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
      {/* eslint-disable-next-line @next/next/no-img-element -- a photo in this browser (blob URL): nothing for next/image to optimize */}
      <img src={files.photoUrl} alt={`Photo of ${name}`} className="hidden h-auto max-h-[320px] w-auto max-w-[260px] rounded-[10px] print:block" />
      <button
        type="button"
        className={`${ghostButton} min-h-9 w-fit px-3.5 text-sm print:hidden`}
        onClick={() => downloadBlob(files.clipName, files.clip)}
      >
        Download video
      </button>
    </div>
  );
}

/** For a move whose video is not ready: being made, or could not be made. */
export function MoveMediaStatus({ status }: { status: 'preparing' | 'failed' }) {
  if (status === 'failed') {
    return <p className="m-0 text-sm text-muted print:hidden">No video of this move: it could not be made in this browser.</p>;
  }
  return (
    <p className="m-0 flex items-center gap-2 text-sm text-muted print:hidden" role="status">
      <span
        className="h-4 w-4 flex-none rounded-full border-2 border-line border-t-accent motion-safe:animate-spin"
        aria-hidden="true"
      />
      Preparing the video of this move…
    </p>
  );
}
