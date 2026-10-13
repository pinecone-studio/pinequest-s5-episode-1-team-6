'use client';

// Photo, video and downloads of one move that lost points: in the results after Finish and on the
// Saved videos page. "Watch" plays the video in place of the photo.

import { useState } from 'react';
import { downloadBlob } from '@/lib/ui/download';
import { ghostButton } from './ui';

export interface MoveMediaFiles {
  clip: Blob;
  clipUrl: string;
  clipName: string;
  photo: Blob;
  photoUrl: string;
  photoName: string;
}

const smallButton = `${ghostButton} min-h-9 px-3.5 text-sm`;

export function MoveMedia({ files, name }: { files: MoveMediaFiles; name: string }) {
  const [watching, setWatching] = useState(false);
  return (
    <div className="mt-1 grid gap-2.5">
      {watching ? (
        <video
          src={files.clipUrl}
          controls
          autoPlay
          muted
          playsInline
          aria-label={`Video of ${name}`}
          className="w-full max-w-[520px] rounded-[10px] bg-stage print:hidden"
        />
      ) : (
        <button
          type="button"
          className="relative w-fit cursor-pointer overflow-hidden rounded-[10px] border-0 bg-stage p-0"
          aria-label={`Watch the video of ${name}`}
          onClick={() => setWatching(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a photo in this browser (blob URL): nothing for next/image to optimize */}
          <img src={files.photoUrl} alt="" className="block h-auto w-[min(260px,70vw)]" />
          <span className="absolute inset-0 grid place-items-center print:hidden" aria-hidden="true">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-black/55 pl-1 text-xl text-white">▶</span>
          </span>
        </button>
      )}
      <div className="flex flex-wrap gap-2 print:hidden">
        <button type="button" className={smallButton} onClick={() => setWatching(!watching)}>
          {watching ? 'Show photo' : 'Watch'}
        </button>
        <button type="button" className={smallButton} onClick={() => downloadBlob(files.clipName, files.clip)}>
          Download video
        </button>
        <button type="button" className={smallButton} onClick={() => downloadBlob(files.photoName, files.photo)}>
          Download photo
        </button>
      </div>
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
