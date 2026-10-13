// Cuts one move out of the routine recording: takes a photo in the middle of the hold, then plays
// that part in a hidden video, draws it on a canvas with the mistake marked (annotate.ts) and records
// it again, so each move is its own small file. Takes about as long as the clip itself. Browser only.

import { drawMistakeMarks, type Mistake, type MistakeMarks } from './annotate';
import { landmarksAt, type ClipWindow } from './clipWindows';
import { pickVideoType, type Recording } from './routineRecorder';

export interface MoveMedia {
  clip: Blob;
  clipType: string;
  photo: Blob;
}

const FPS = 30;
const EXTRA_WAIT_MS = 10_000; // give up when a clip takes this much longer than its length

/**
 * @param mistakes the move's deductions, marked on the video while the move is held
 * @param pointsLost the move's total, for the "Points lost here" badge
 */
export async function cutClip(recording: Recording, part: ClipWindow, mistakes: Mistake[], pointsLost: number): Promise<MoveMedia> {
  const clipType = pickVideoType('mp4');
  if (!clipType) throw new Error('This browser cannot record video');

  const url = URL.createObjectURL(recording.blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await once(video, 'loadedmetadata');
    await fixDuration(video);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    const marks: MistakeMarks = {
      mistakes,
      pointsLost,
      clipFromMs: part.fromMs,
      clipToMs: part.toMs,
      holdFromMs: part.holdFromMs,
      holdToMs: part.holdToMs,
    };
    const draw = () => {
      const recMs = video.currentTime * 1000;
      ctx.drawImage(video, 0, 0);
      drawMistakeMarks(ctx, landmarksAt(recording.timeline, recMs), recording.scale, marks, recMs);
    };

    await seek(video, part.photoMs / 1000);
    draw();
    const photo = await toJpeg(canvas);

    await seek(video, part.fromMs / 1000);
    draw();
    const clip = await recordPart(video, canvas, draw, clipType, part);
    return { clip, clipType, photo };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

/** Plays from the current position to `part.toMs`, recording the canvas. */
async function recordPart(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  drawFrame: () => void,
  clipType: string,
  part: ClipWindow,
): Promise<Blob> {
  const media = new MediaRecorder(canvas.captureStream(FPS), { mimeType: clipType, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  media.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => media.addEventListener('stop', () => resolve(), { once: true }));

  const lengthMs = part.toMs - part.fromMs;
  await new Promise<void>((resolve, reject) => {
    let frame = 0;
    const timer = setTimeout(() => finish(new Error('Cutting the video took too long')), lengthMs + EXTRA_WAIT_MS);
    const finish = (err?: Error) => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      video.pause();
      video.removeEventListener('timeupdate', check);
      video.removeEventListener('ended', onEnded);
      if (err) reject(err);
      else resolve();
    };
    const atEnd = () => video.currentTime * 1000 >= part.toMs;
    const check = () => {
      if (atEnd()) finish();
    };
    const onEnded = () => finish();
    const draw = () => {
      drawFrame();
      if (atEnd()) finish();
      else frame = requestAnimationFrame(draw);
    };
    video.addEventListener('timeupdate', check);
    video.addEventListener('ended', onEnded);
    media.start();
    video.play().then(() => (frame = requestAnimationFrame(draw)), (err: Error) => finish(err));
  });
  media.stop();
  media.stream.getTracks().forEach((track) => track.stop());
  await stopped;
  return new Blob(chunks, { type: clipType });
}

/**
 * Recorded WebM files don't say how long they are (duration = Infinity), which breaks seeking.
 * Jumping far past the end makes the browser work it out.
 */
async function fixDuration(video: HTMLVideoElement): Promise<void> {
  if (Number.isFinite(video.duration)) return;
  video.currentTime = 1e101;
  await once(video, 'durationchange', 3000).catch(() => undefined);
  await seek(video, 0);
}

async function seek(video: HTMLVideoElement, seconds: number): Promise<void> {
  const target = Number.isFinite(video.duration) ? Math.min(seconds, video.duration) : seconds;
  if (Math.abs(video.currentTime - target) < 0.001) return;
  const done = once(video, 'seeked');
  video.currentTime = target;
  await done;
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not make the photo'))), 'image/jpeg', 0.85),
  );
}

/** Resolves on the first `event` (or rejects on an error, or after `timeoutMs`). */
function once(video: HTMLVideoElement, event: string, timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new Error(`Video did not fire ${event}`)), timeoutMs);
    const onEvent = () => done();
    const onError = () => done(new Error(video.error?.message || 'The video could not be read'));
    function done(err?: Error) {
      clearTimeout(timer);
      video.removeEventListener(event, onEvent);
      video.removeEventListener('error', onError);
      if (err) reject(err);
      else resolve();
    }
    video.addEventListener(event, onEvent);
    video.addEventListener('error', onError);
  });
}
