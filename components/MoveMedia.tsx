'use client';

// The video of one move that lost points, with the mistake marked on it (red body part, tag, badge
// and a strip showing when), and a Download button. The photo from the middle of the move is the
// video's cover picture, and what prints. Used in the results after Finish and on Saved videos.

import { downloadBlob } from '@/lib/ui/download';
import { ghostButton } from './ui';

export interface MoveMediaFiles {
  clip: Blob;
  clipUrl: string;
  clipName: string;
  photoUrl: string;
}

export function MoveMedia({ files, name }: { files: MoveMediaFiles; name: string }) {
  return (
    <div className="mt-1 grid gap-2.5">
      <video
        src={files.clipUrl}
        poster={files.photoUrl}
        controls
        muted
        playsInline
        preload="metadata"
        aria-label={`Video of ${name}. The part that lost points is marked in red.`}
        className="w-full max-w-[520px] rounded-[10px] bg-stage print:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- a photo in this browser (blob URL): nothing for next/image to optimize */}
      <img src={files.photoUrl} alt={`Photo of ${name}`} className="hidden w-[260px] rounded-[10px] print:block" />
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
