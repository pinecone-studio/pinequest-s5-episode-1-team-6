// Video analysis (/tools/video-analyze): steps through a recorded routine frame by frame with the
// same pipeline as the live app (pose model -> smoothing -> balance detector) and records what is
// recognized, when, and why not. Browser only (needs a <video> element).

import { createPoseTracker, type ModelVariant, type PoseTracker } from '../pose';
import { LandmarkSmoother } from '../oneEuro';
import { LEG_POINTS, minVisibility, type Landmarks } from '../geometry';
import { BalanceDetector, type BalanceLive } from '../elements/balances';
import { SplitLeapDetector } from '../elements/splitLeap';
import { AttitudePivotDetector } from '../elements/attitudePivot';
import type { LandmarkRecording } from './replay';
import { balanceFrame } from '../elements/balanceFrame';
import { drawSkeleton } from '../draw';
import type { ElementEvent } from '../types';

export interface FrameRecord {
  t: number;
  person: boolean;
  legVis: number;
  shape: string | null;
  confidence: number | null;
  hint: string | null;
  deduction: number | null;
  dev: string;
  facing: number | null;
  forward: boolean | null;
  raised: boolean | null;
  split: number | null;
  freeKnee: number | null;
  lean: number | null;
  legUp: number | null;
  help: boolean | null;
  releve: boolean | null;
  fullLegs: boolean | null;
  lm: [number, number, number][] | null;
}

export interface AnalysisOptions {
  model?: ModelVariant;
  fps?: number;
  sheetEvery?: number; // seconds between contact-sheet frames
  snapshotTimes?: number[]; // full-size snapshots at these times (s), for debugging and reports
}

export interface VideoAnalysis {
  model: ModelVariant;
  fps: number;
  duration: number;
  width: number;
  height: number;
  frames: FrameRecord[];
  events: ElementEvent[];
  snapshots: Record<number, string>;
  summary: string;
  recording: LandmarkRecording; // raw body points, for `npm run replay` and the video tests
}

/** A small picture of a frame for the contact sheet. */
export interface SheetFrame {
  t: number;
  image: string; // data URL
  caption: string;
}

const trackers: Partial<Record<ModelVariant, PoseTracker>> = {};

export async function analyzeVideo(
  video: HTMLVideoElement,
  src: string,
  { model = 'heavy', fps = 15, sheetEvery = 1, snapshotTimes = [] }: AnalysisOptions,
  onProgress: (status: string) => void,
  onSheetFrame: (frame: SheetFrame) => void,
): Promise<VideoAnalysis> {
  onProgress(`Loading ${model} model…`);
  trackers[model] ??= await createPoseTracker(model, 'VIDEO');
  const tracker = trackers[model]!;
  video.src = src;
  await new Promise((r) => { video.onloadeddata = r; });
  const { videoWidth: w, videoHeight: h, duration } = video;

  const smoother = new LandmarkSmoother();
  const events: ElementEvent[] = [];
  const leap = new SplitLeapDetector((e) => events.push(e));
  const pivot = new AttitudePivotDetector((e) => events.push(e));
  const balance = new BalanceDetector((e) => events.push(e));
  const recording: LandmarkRecording = { src: src.split('/').pop(), w: 0, h: 0, fps, frames: [] };
  const frames: FrameRecord[] = [];
  const snapshots: Record<number, string> = {};
  const pending = [...snapshotTimes].sort((a, b) => a - b);
  let nextSheet = 0;

  for (let t = 0; t < duration; t += 1 / fps) {
    video.currentTime = t;
    await new Promise((r) => { video.onseeked = r; });
    // Give the decoder a moment to present the seeked frame (paused videos may never fire
    // requestVideoFrameCallback, so a short timeout is the fallback).
    await Promise.race([
      new Promise<void>((r) => video.requestVideoFrameCallback?.(() => r())),
      new Promise((r) => setTimeout(r, 60)),
    ]);
    const raw = tracker.detect(video);
    const ms = t * 1000;
    recording.frames.push({
      t: Math.round(ms),
      lm: raw ? raw.map((p) => [round1(p.x * w), round1(p.y * h), Math.round((p.visibility ?? 0) * 1000) / 1000]) : null,
    });
    let lm: Landmarks | null = null;
    if (raw) {
      lm = smoother.smooth(raw.map((p) => ({ x: p.x * w, y: p.y * h, visibility: p.visibility ?? 0 })), t);
    } else smoother.reset();
    leap.update({ t: ms, lm });
    pivot.update({ t: ms, lm });
    balance.update({ t: ms, lm, airborne: leap.live.airborne, turning: pivot.live.turning });
    const live = balance.live;
    const f = lm ? balanceFrame(lm) : null;
    frames.push({
      t: Math.round(ms),
      person: Boolean(lm),
      legVis: lm ? Math.round(minVisibility(lm, LEG_POINTS) * 100) / 100 : 0,
      shape: live.shape,
      confidence: live.confidence == null ? null : Math.round(live.confidence * 100) / 100,
      hint: live.hint,
      deduction: live.deduction,
      dev: live.deviations?.map((d) => `${d.segment}:${Math.round(d.deg)}`).join(' ') ?? '',
      facing: f?.facing ?? null, forward: f?.forward ?? null, raised: f?.raised ?? null,
      split: f ? Math.round(f.split) : null, freeKnee: f ? Math.round(f.freeKnee) : null,
      lean: f ? Math.round(f.lean) : null, legUp: f ? Math.round(f.legUp) : null,
      help: f?.help ?? null, releve: f?.releve ?? null, fullLegs: f?.fullLegs ?? null,
      lm: lm ? lm.map((p) => [Math.round(p.x), Math.round(p.y), Math.round((p.visibility ?? 0) * 100) / 100]) : null,
    });
    // Full-size snapshot with the skeleton, for requested times (debugging / reports).
    if (pending.length && t >= pending[0] - 0.5 / fps) {
      const at = pending.shift()!;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d')!;
      g.drawImage(video, 0, 0);
      if (lm) drawSkeleton(g, lm.map((p) => ({ ...p, visibility: Math.max(p.visibility ?? 0, 0.31) })), '#ff3b6b');
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(0, 0, w, 48);
      g.fillStyle = '#000'; g.font = '28px sans-serif';
      g.fillText(`t=${t.toFixed(1)}s  ${live.shape ?? live.hint ?? 'ready'}  split ${f ? Math.round(f.split) : '-'}°  lean ${f ? Math.round(f.lean) : '-'}°`, 12, 34);
      snapshots[at] = c.toDataURL('image/jpeg', 0.75);
    }
    if (t >= nextSheet) {
      nextSheet += sheetEvery;
      onSheetFrame(sheetFrame(video, t, lm, live, w, h));
    }
    onProgress(`${model}: ${t.toFixed(1)} / ${duration.toFixed(1)} s`);
  }
  pivot.flush();
  balance.flush();
  events.sort((a, b) => a.tStart - b.tStart);
  onProgress(`Done (${model}).`);
  Object.assign(recording, { w, h });
  return { model, fps, duration, width: w, height: h, frames, events, snapshots, summary: summarize(frames, events), recording };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function sheetFrame(video: HTMLVideoElement, t: number, lm: Landmarks | null, live: BalanceLive, w: number, h: number): SheetFrame {
  const c = document.createElement('canvas');
  const scale = 360 / Math.max(w, h);
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const g = c.getContext('2d')!;
  g.drawImage(video, 0, 0, c.width, c.height);
  const overlay = document.createElement('canvas');
  overlay.width = w; overlay.height = h;
  drawSkeleton(overlay.getContext('2d')!, lm);
  g.drawImage(overlay, 0, 0, c.width, c.height);
  return {
    t,
    image: c.toDataURL('image/jpeg', 0.8),
    caption: `${t.toFixed(1)} s · ${live.shape ?? (live.hint ?? '–')}${live.deduction != null ? ` · −${live.deduction.toFixed(2)}` : ''}`,
  };
}

/** Text summary: how often a person and the legs were found, a timeline, and the judged moves. */
export function summarize(frames: FrameRecord[], events: ElementEvent[]): string {
  const n = frames.length;
  const pct = (k: number) => `${Math.round((100 * k) / n)}%`;
  const lines = [
    `${n} frames · person found ${pct(frames.filter((f) => f.person).length)} · legs visible ≥0.5 ${pct(frames.filter((f) => f.legVis >= 0.5).length)}`,
    `pose recognized in ${pct(frames.filter((f) => f.shape).length)} of frames`,
    '',
    'Timeline (shape or reason):',
  ];
  let cur: { label: string; from: number; to: number } | null = null;
  for (const f of frames) {
    const label = f.shape ?? (f.hint ?? 'ready');
    if (!cur || cur.label !== label) {
      if (cur) lines.push(`  ${(cur.from / 1000).toFixed(1)}–${(cur.to / 1000).toFixed(1)} s  ${cur.label}`);
      cur = { label, from: f.t, to: f.t };
    } else cur.to = f.t;
  }
  if (cur) lines.push(`  ${(cur.from / 1000).toFixed(1)}–${(cur.to / 1000).toFixed(1)} s  ${cur.label}`);
  lines.push('', `Judged moves: ${events.length}`);
  for (const e of events) {
    lines.push(`  ${(e.tStart / 1000).toFixed(1)}–${(e.tEnd / 1000).toFixed(1)} s  ${e.element}  D ${e.dbValue.toFixed(2)}  E −${e.penalties.reduce((a, p) => a + p.value, 0).toFixed(2)}`
      + (e.penalties.length ? `  (${e.penalties.map((p) => `${p.reason} −${p.value.toFixed(2)}`).join('; ')})` : '  (clean)'));
  }
  return lines.join('\n');
}
