'use client';

// Reference video maker: turns a video of a balance done right into a "How it should look" clip for
// public/reference/ (skeleton drawn on it, 16:9, text cut off). Nothing is uploaded.
// Dev convenience: /tools/reference-video?src=<same-origin video>&top=0.2&bottom=0

import { useEffect, useRef, useState } from 'react';
import { makeReferenceVideo, type ReferenceClip, type ReferenceOptions } from '@/lib/tools/referenceVideo';
import { downloadBlob } from '@/lib/ui/download';
import { ghostButton, input, secondaryButton } from '../ui';
import { ToolPage, useAppPoseLibrary } from './ToolPage';

export function ReferenceVideo() {
  useAppPoseLibrary();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [status, setStatus] = useState('Choose a video.');
  const [clip, setClip] = useState<(ReferenceClip & { url: string; name: string }) | null>(null);

  async function make(src: string, name: string, options: ReferenceOptions) {
    try {
      const result = await makeReferenceVideo(videoRef.current!, src, options, setStatus);
      const ext = result.type.includes('mp4') ? 'mp4' : 'webm';
      setClip({ ...result, url: URL.createObjectURL(result.blob), name: `${name.replace(/\.[^.]+$/, '')}.${ext}` });
      (window as unknown as { referenceClip: Blob }).referenceClip = result.blob; // for scripted runs
    } catch (err) {
      setStatus(`Failed: ${(err as Error).message}`);
    }
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const src = q.get('src');
    if (src) {
      void make(src, src.split('/').pop() ?? 'reference', {
        cropTop: Number(q.get('top') ?? 0),
        cropBottom: Number(q.get('bottom') ?? 0),
      });
    }
  }, []);

  const label = 'flex items-center gap-2 text-[13px] font-semibold text-muted';
  const share = (value: number, onChange: (v: number) => void) => (
    <select className={`${input} w-auto`} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {[0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3].map((v) => <option key={v} value={v}>{`${Math.round(v * 100)}%`}</option>)}
    </select>
  );
  return (
    <ToolPage
      title="Reference video"
      intro="Makes a “How it should look” clip from a video of a balance done right: the skeleton drawn on it like on the gymnast's own move video, in a 16:9 frame (a portrait clip gets blurred sides), with text in the video cut off the top or bottom. Judge the clip in the app first: it must be the same element with no points lost. Save the result in public/reference/ and map it in lib/reference.ts. Nothing is uploaded."
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className={label}>Cut off the top {share(cropTop, setCropTop)}</label>
        <label className={label}>Cut off the bottom {share(cropBottom, setCropBottom)}</label>
        <label className={`${secondaryButton} cursor-pointer`}>
          Choose video
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setClip(null);
              void make(URL.createObjectURL(f), f.name, { cropTop, cropBottom });
            }}
          />
        </label>
        <button className={ghostButton} disabled={!clip} onClick={() => clip && downloadBlob(clip.name, clip.blob)}>
          Download clip
        </button>
        <span className="text-sm text-muted" role="status">{status}</span>
      </div>
      {clip && <video src={clip.url} controls muted playsInline className="h-auto w-full max-w-[960px] rounded-[10px] bg-stage" />}
      <video ref={videoRef} muted playsInline hidden />
    </ToolPage>
  );
}
