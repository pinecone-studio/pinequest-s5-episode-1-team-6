// Makes a "How it should look" clip (public/reference/, lib/reference.ts) from a video of a balance
// done right, so it looks like the gymnast's own move video next to it in the practice results:
//   - the skeleton drawn on it, like the live app (legs green while the balance is recognized). No
//     angle labels: they are colored by how far each leg is from straight, so an attitude's bent knee
//     would show red numbers on a clip that lost no points;
//   - a 16:9 frame: a portrait or square clip is shown whole in the middle, with a blurred copy of
//     itself filling the sides;
//   - optionally a strip cut off the top or bottom first (text burned into the video).
// Two passes: every frame through the pose model first (seeking, so no frame is skipped), then the
// clip plays once and the drawings are recorded. Browser only. Used by /tools/reference-video.

import { createPoseTracker, type ModelVariant } from '../pose';
import { LandmarkSmoother } from '../oneEuro';
import type { Landmarks } from '../geometry';
import { drawSkeleton } from '../draw';
import { BalanceDetector } from '../elements/balances';
import { SplitLeapDetector } from '../elements/splitLeap';
import { pickVideoType } from '../recording/routineRecorder';

export interface ReferenceOptions {
  cropTop: number; // share of the height cut off the top, 0 to 0.4
  cropBottom: number; // same for the bottom
  model?: ModelVariant;
}

export interface ReferenceClip {
  blob: Blob;
  type: string;
}

// The size of a move video from a 16:9 camera (routineRecorder.ts records at most 960 px wide).
const OUT_W = 960;
const OUT_H = 540;
const FPS = 30;
const GREEN = '#4cc38a'; // legs while the balance is recognized (same colors as session.ts)
const BLUE = '#7aa7ff';

interface BodyFrame {
  t: number; // seconds
  lm: Landmarks | null; // in video pixels
  inShape: boolean;
}

export async function makeReferenceVideo(
  video: HTMLVideoElement,
  src: string,
  { cropTop, cropBottom, model = 'heavy' }: ReferenceOptions,
  onProgress: (status: string) => void,
): Promise<ReferenceClip> {
  const type = pickVideoType('mp4');
  if (!type) throw new Error('This browser cannot record video');
  video.muted = true;
  video.src = src;
  await new Promise((resolve, reject) => {
    video.onloadeddata = resolve;
    video.onerror = () => reject(new Error('The video could not be read'));
  });

  const body = await findBody(video, model, onProgress);

  // The part of the video that is kept, and where it goes in the 16:9 frame.
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const crop = { x: 0, y: vh * cropTop, w: vw, h: vh * (1 - cropTop - cropBottom) };
  const fit = Math.min(OUT_W / crop.w, OUT_H / crop.h);
  const place = { x: (OUT_W - crop.w * fit) / 2, y: (OUT_H - crop.h * fit) / 2, w: crop.w * fit, h: crop.h * fit };
  const fillsFrame = place.w >= OUT_W - 1 && place.h >= OUT_H - 1;

  const canvas = document.createElement('canvas');
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext('2d')!;
  const overlay = document.createElement('canvas');
  overlay.width = OUT_W;
  overlay.height = OUT_H;
  const octx = overlay.getContext('2d')!;

  const draw = (seconds: number) => {
    if (!fillsFrame) {
      // The sides: the same picture, larger, blurred and darker (10% extra hides the blur's soft edge).
      const cover = Math.max(OUT_W / crop.w, OUT_H / crop.h) * 1.1;
      ctx.filter = 'blur(24px) brightness(0.6)';
      ctx.drawImage(video, crop.x, crop.y, crop.w, crop.h, (OUT_W - crop.w * cover) / 2, (OUT_H - crop.h * cover) / 2, crop.w * cover, crop.h * cover);
      ctx.filter = 'none';
    }
    ctx.drawImage(video, crop.x, crop.y, crop.w, crop.h, place.x, place.y, place.w, place.h);
    const frame = nearest(body, seconds);
    if (!frame?.lm) return;
    const lm = frame.lm.map((p) => ({ ...p, x: place.x + (p.x - crop.x) * fit, y: place.y + (p.y - crop.y) * fit }));
    drawSkeleton(octx, lm, frame.inShape ? GREEN : BLUE);
    ctx.save(); // only over the video itself, not over the blurred sides
    ctx.beginPath();
    ctx.rect(place.x, place.y, place.w, place.h);
    ctx.clip();
    ctx.drawImage(overlay, 0, 0);
    ctx.restore();
  };

  onProgress('Recording…');
  video.currentTime = 0;
  await new Promise((r) => { video.onseeked = r; });
  draw(0);
  const blob = await recordPlayback(video, canvas, draw, type);
  onProgress(`Done: ${(blob.size / 1024).toFixed(0)} KB.`);
  return { blob, type };
}

/** Pass 1: every frame through the pose model, smoothed and checked for a balance like the live app. */
async function findBody(video: HTMLVideoElement, model: ModelVariant, onProgress: (status: string) => void): Promise<BodyFrame[]> {
  onProgress(`Loading ${model} model…`);
  const tracker = await createPoseTracker(model, 'VIDEO');
  const { videoWidth: w, videoHeight: h, duration } = video;
  const smoother = new LandmarkSmoother();
  const leap = new SplitLeapDetector(() => undefined);
  const balance = new BalanceDetector(() => undefined);
  const frames: BodyFrame[] = [];
  try {
    for (let t = 0; t < duration; t += 1 / FPS) {
      video.currentTime = t;
      await new Promise((r) => { video.onseeked = r; });
      // Give the decoder a moment to show the seeked frame (see videoAnalysis.ts).
      await Promise.race([
        new Promise<void>((r) => video.requestVideoFrameCallback?.(() => r())),
        new Promise((r) => setTimeout(r, 60)),
      ]);
      const raw = tracker.detect(video);
      let lm: Landmarks | null = null;
      if (raw) lm = smoother.smooth(raw.map((p) => ({ x: p.x * w, y: p.y * h, visibility: p.visibility ?? 0 })), t);
      else smoother.reset();
      leap.update({ t: t * 1000, lm });
      balance.update({ t: t * 1000, lm, airborne: leap.live.airborne, turning: false });
      frames.push({ t, lm, inShape: Boolean(balance.live.shape) });
      onProgress(`Finding the body: ${t.toFixed(1)} / ${duration.toFixed(1)} s`);
    }
  } finally {
    tracker.close();
  }
  return frames;
}

function nearest(frames: BodyFrame[], seconds: number): BodyFrame | null {
  let best: BodyFrame | null = null;
  for (const f of frames) if (!best || Math.abs(f.t - seconds) < Math.abs(best.t - seconds)) best = f;
  return best;
}

/**
 * Pass 2: plays the video once from the start, drawing it on every animation frame (the video
 * element is hidden, so requestVideoFrameCallback may never fire), and records the canvas.
 */
async function recordPlayback(video: HTMLVideoElement, canvas: HTMLCanvasElement, draw: (seconds: number) => void, type: string): Promise<Blob> {
  const media = new MediaRecorder(canvas.captureStream(FPS), { mimeType: type, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  media.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => media.addEventListener('stop', () => resolve(), { once: true }));

  await new Promise<void>((resolve, reject) => {
    let frame = 0;
    const onFrame = () => {
      draw(video.currentTime);
      frame = requestAnimationFrame(onFrame);
    };
    video.onended = () => {
      cancelAnimationFrame(frame);
      draw(video.currentTime); // the last frame
      resolve();
    };
    media.start();
    video.play().then(() => (frame = requestAnimationFrame(onFrame)), reject);
  });
  media.stop();
  media.stream.getTracks().forEach((track) => track.stop());
  await stopped;
  return new Blob(chunks, { type });
}
