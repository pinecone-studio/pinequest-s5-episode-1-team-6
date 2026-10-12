'use client';

// Pose image check: measures the split, passé and balance rules on a single photo
// (e.g. the peak frame of a leap) with the same code the live app uses. Nothing is uploaded.
// Dev convenience: /tools/image-check?src=<same-origin image path>

import { useEffect, useRef, useState } from 'react';
import { getImageTracker, landmarksFromImage, analyzeLandmarks } from '@/lib/tools/analyzeImage';
import { drawSkeleton } from '@/lib/draw';
import { ToolPage, useAppPoseLibrary } from './ToolPage';

export function ImageCheck() {
  useAppPoseLibrary();
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [out, setOut] = useState('Loading pose model…');

  async function analyze(src: string) {
    const img = imgRef.current!;
    const canvas = canvasRef.current!;
    img.src = src;
    await img.decode();
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const lm = await landmarksFromImage(img);
    drawSkeleton(canvas.getContext('2d')!, lm);
    const w = window as unknown as { result: unknown };
    if (!lm) {
      setOut('No person found.');
      w.result = { found: false };
      return;
    }
    const a = analyzeLandmarks(lm);
    const { leap, passe, balance } = a;
    w.result = { found: true, ...a }; // for scripted checks
    setOut([
      `Split angle: ${a.split.toFixed(1)}°   (leg visibility ${a.visibility.toFixed(2)})`,
      `If this is the peak of a split leap -> DB ${leap.dbValid ? 'valid' : 'NOT valid'} ${leap.dbValue.toFixed(2)}, `
        + `${leap.penalties.map((p) => `E −${p.value.toFixed(2)} ${p.reason}`).join('; ') || 'no E penalty'}`,
      ...leap.warnings.map((warning) => `⚠ ${warning}`),
      `Leg length / torso: ${a.legRatios.map((r) => r.toFixed(2)).join(', ')} (full length is about 1.8-2.1)`,
      `Passé check: thigh ${passe.thighDeg.toFixed(0)}°, support knee ${passe.supportKneeDeg.toFixed(0)}°, in passé shape: ${passe.inShape}`,
      `Balance shape: ${a.shape}`
        + (balance.shape ? ` · ${balance.deviations.map((d) => `${d.label} ${Math.round(d.deg)}°`).join(', ')} · shape deduction ${a.deduction!.toFixed(2)}` : '')
        + (a.legsVisible ? ` · help ${balance.help} · relevé ${balance.releve} · facing ${balance.facing}`
          + ` · free knee ${Math.round(balance.freeKnee ?? 0)}° · trunk ${Math.round(balance.trunk ?? 0)}°` : ' · legs not visible'),
    ].join('\n'));
  }

  useEffect(() => {
    let cancelled = false;
    getImageTracker().then(() => {
      if (cancelled) return;
      setOut('Ready. Choose a photo.');
      const src = new URLSearchParams(window.location.search).get('src');
      if (src) void analyze(src);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <ToolPage
      title="Pose image check"
      intro="For validating rules on single photos (e.g. the peak frame of a leap). Pick a photo; it measures the split and passé angles with the same code the live app uses. Nothing is uploaded."
    >
      <p className="m-0">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void analyze(URL.createObjectURL(f));
          }}
        />
      </p>
      <div className="relative inline-block max-w-full justify-self-start">
        {/* eslint-disable-next-line @next/next/no-img-element -- a local photo the user picked, drawn on */}
        <img ref={imgRef} alt="" className="block h-auto max-w-full" />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
      <pre className="m-0 rounded-lg border border-line bg-card p-3 text-sm whitespace-pre-wrap">{out}</pre>
    </ToolPage>
  );
}
