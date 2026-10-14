// Records the routine while judging: the video with the skeleton and the leg angles drawn on it,
// so a move's video shows how it was judged. Browser only. The recording stays in memory until
// the session cuts the moves out of it (clipCutter.ts); then it is dropped.

import { drawLegAngles, type AnglesFn } from '../draw';
import type { Landmarks } from '../geometry';
import type { TimelinePoint } from './clipWindows';

const MAX_WIDTH = 960; // smaller than the camera: enough to see the shape, quicker to record and store
const FPS = 30;

export interface Recording {
  blob: Blob;
  mimeType: string;
  timeline: TimelinePoint[];
  durationMs: number;
  scale: number; // original video pixels -> recording pixels (for the landmarks in the timeline)
}

/**
 * A video type this browser can record, or null. The routine is recorded as WebM where possible
 * (Chrome seeks in it reliably when cutting); the move videos prefer MP4, which more players open.
 */
export function pickVideoType(prefer: 'webm' | 'mp4'): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const webm = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mp4 = ['video/mp4;codecs=avc1', 'video/mp4'];
  const order = prefer === 'webm' ? [...webm, ...mp4] : [...mp4, ...webm];
  return order.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export class RoutineRecorder {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private angles: HTMLCanvasElement | null = null; // leg angles, when the page does not show them
  private media: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timeline: TimelinePoint[] = [];
  private startedAt = 0;
  private mimeType = '';
  private scale = 1;

  get recording(): boolean {
    return this.media !== null;
  }

  /** Starts recording `video`. Returns false where the browser can't record (then there are no move videos). */
  start(video: HTMLVideoElement): boolean {
    this.discard();
    const mimeType = pickVideoType('webm');
    if (!mimeType || !video.videoWidth) return false;
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof canvas.captureStream !== 'function') return false;
    try {
      const media = new MediaRecorder(canvas.captureStream(FPS), { mimeType, videoBitsPerSecond: 2_500_000 });
      // Each recording collects into its own list: a late piece of a discarded one must not leak into the next.
      const chunks: Blob[] = [];
      media.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      media.start(1000);
      this.media = media;
      this.chunks = chunks;
    } catch (err) {
      console.warn('Recording is not available in this browser', err);
      return false;
    }
    this.canvas = canvas;
    this.ctx = ctx;
    this.mimeType = mimeType;
    this.scale = scale;
    this.startedAt = performance.now();
    return true;
  }

  /**
   * Adds the current frame: the video, then the overlay canvas (skeleton) on top.
   * @param t session time of this frame (the clock the move times use)
   * @param withAngles also draw these angles (when the overlay doesn't already have them), or null
   */
  addFrame(t: number, video: HTMLVideoElement, overlay: HTMLCanvasElement | null, lm: Landmarks | null, withAngles: AnglesFn | null): void {
    const { canvas, ctx } = this;
    if (!this.media || !canvas || !ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (overlay) ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
    if (withAngles && lm) ctx.drawImage(this.anglesLayer(video, lm, withAngles), 0, 0, canvas.width, canvas.height);
    // A copy of the body seen, so the clip can mark the body part that lost points.
    const body = lm ? lm.map((p) => ({ x: p.x, y: p.y, visibility: p.visibility })) : null;
    this.timeline.push({ t, recMs: performance.now() - this.startedAt, lm: body });
  }

  /** Angles drawn at full video size, so the labels look the same as on the page. */
  private anglesLayer(video: HTMLVideoElement, lm: Landmarks, angles: AnglesFn): HTMLCanvasElement {
    this.angles ??= document.createElement('canvas');
    const layer = this.angles;
    if (layer.width !== video.videoWidth || layer.height !== video.videoHeight) {
      layer.width = video.videoWidth;
      layer.height = video.videoHeight;
    }
    const ctx = layer.getContext('2d')!;
    ctx.clearRect(0, 0, layer.width, layer.height);
    drawLegAngles(ctx, lm, angles);
    return layer;
  }

  /** Stops and returns the recording, or null when nothing was recorded. */
  async stop(): Promise<Recording | null> {
    const media = this.media;
    if (!media) return null;
    const stopped = new Promise<void>((resolve) => media.addEventListener('stop', () => resolve(), { once: true }));
    media.stop();
    media.stream.getTracks().forEach((track) => track.stop());
    await stopped;
    const recording: Recording = {
      blob: new Blob(this.chunks, { type: this.mimeType }),
      mimeType: this.mimeType,
      timeline: this.timeline,
      durationMs: performance.now() - this.startedAt,
      scale: this.scale,
    };
    this.reset();
    return recording.timeline.length > 0 ? recording : null;
  }

  /** Stops without keeping anything (source changed, routine started over). */
  discard(): void {
    if (this.media && this.media.state !== 'inactive') this.media.stop();
    this.media?.stream.getTracks().forEach((track) => track.stop());
    this.reset();
  }

  private reset(): void {
    this.media = null;
    this.chunks = [];
    this.timeline = [];
    this.canvas = null;
    this.ctx = null;
  }
}
