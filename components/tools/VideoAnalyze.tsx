'use client';

// Video analysis: steps through a recorded routine frame by frame and shows what is recognized,
// when, and why not. Nothing is uploaded. Use it to find where tracking or recognition fails.
// Dev convenience: /tools/video-analyze?src=<same-origin video>&model=heavy&snap=3.5,9

import { useEffect, useRef, useState } from 'react';
import { analyzeVideo, type SheetFrame } from '@/lib/tools/videoAnalysis';
import type { ModelVariant } from '@/lib/pose';
import { input, secondaryButton } from '../ui';
import { ToolPage, useAppPoseLibrary } from './ToolPage';

export function VideoAnalyze() {
  useAppPoseLibrary();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [model, setModel] = useState<ModelVariant>('heavy');
  const [fps, setFps] = useState(15);
  const [status, setStatus] = useState('Choose a video.');
  const [summary, setSummary] = useState('–');
  const [sheet, setSheet] = useState<SheetFrame[]>([]);

  async function analyze(src: string, opts: { model: ModelVariant; fps: number; snapshotTimes?: number[] }) {
    const result = await analyzeVideo(videoRef.current!, src, opts, setStatus, (frame) => setSheet((s) => [...s, frame]));
    (window as unknown as { analysis: unknown }).analysis = result; // for scripted checks
    setSummary(result.summary);
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const src = q.get('src');
    if (src) {
      void analyze(src, {
        model: (q.get('model') as ModelVariant | null) ?? 'heavy',
        fps: 15,
        snapshotTimes: (q.get('snap') ?? '').split(',').filter(Boolean).map(Number),
      });
    }
  }, []);

  const label = 'flex items-center gap-2 text-[13px] font-semibold text-muted';
  return (
    <ToolPage
      title="Video analysis"
      intro="Steps through a recorded routine frame by frame with the same pipeline as the live app (pose model → smoothing → balance detector) and shows what is recognized, when, and why not. Nothing is uploaded. Use it to find where tracking or recognition fails."
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${secondaryButton} cursor-pointer`}>
          Choose video
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setSheet([]);
              void analyze(URL.createObjectURL(f), { model, fps });
            }}
          />
        </label>
        <label className={label}>
          Model
          <select className={`${input} w-auto`} value={model} onChange={(e) => setModel(e.target.value as ModelVariant)}>
            <option value="heavy">Heavy</option>
            <option value="full">Full</option>
            <option value="lite">Lite</option>
          </select>
        </label>
        <label className={label}>
          Frames / s
          <select className={`${input} w-auto`} value={fps} onChange={(e) => setFps(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={30}>30</option>
          </select>
        </label>
        <span className="text-sm text-muted">{status}</span>
      </div>
      <pre className="m-0 overflow-x-auto bg-card p-3.5 text-xs whitespace-pre-wrap">{summary}</pre>
      <section className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5">
        {sheet.map((f) => (
          <figure key={f.t} className="m-0 grid gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
            <img src={f.image} alt="" className="h-auto w-full bg-card" />
            <figcaption className="text-[11px] text-muted">{f.caption}</figcaption>
          </figure>
        ))}
      </section>
      <video ref={videoRef} muted playsInline hidden />
    </ToolPage>
  );
}
