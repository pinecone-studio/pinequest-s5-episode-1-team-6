// Pretrained pose model: Google MediaPipe Pose Landmarker, running in the browser.
// Nothing is trained here. The library comes from npm (pinned in package.json); its WASM files and
// the model weights load from pinned CDN URLs (no weights in git). The model returns 33 body
// landmarks per frame. Browser only: import this from client components.
// The judging page preloads the model (preloadPoseModel) and keeps it in Cache Storage (modelCache.ts),
// so "Turn on camera" does not wait for a 30 MB download.

import type { NormalizedLandmark, PoseLandmarker as PoseLandmarkerType } from '@mediapipe/tasks-vision';
import { cachedDownload, forgetOtherFiles, watchDownload, type DownloadProgress } from './modelCache';

const VERSION = '0.10.14'; // keep equal to the @mediapipe/tasks-vision version in package.json
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;

export const MODELS = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  // Largest and most accurate (30 MB), best for extreme shapes like splits; slower.
  heavy: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
};

export type ModelVariant = keyof typeof MODELS;

export interface PoseTracker {
  delegate: 'GPU' | 'CPU';
  /** Landmarks (normalized 0..1) of the person in this video frame, or null. */
  detect(video: HTMLVideoElement): NormalizedLandmark[] | null;
  /** Same for a single photo (tracker created in IMAGE mode). */
  detectImage(image: HTMLImageElement): NormalizedLandmark[] | null;
  close(): void;
}

type VisionLibrary = typeof import('@mediapipe/tasks-vision');
type WasmFileset = Awaited<ReturnType<VisionLibrary['FilesetResolver']['forVisionTasks']>>;

let visionPromise: Promise<{ library: VisionLibrary; fileset: WasmFileset }> | null = null;

/** The MediaPipe library and its WASM file locations, loaded once per page. */
function loadVision(): Promise<{ library: VisionLibrary; fileset: WasmFileset }> {
  visionPromise ??= (async () => {
    // Loaded on demand so the (large) library is not part of the page's first download.
    const library = await import('@mediapipe/tasks-vision');
    const fileset = await library.FilesetResolver.forVisionTasks(WASM_URL);
    return { library, fileset };
  })().catch((err) => {
    visionPromise = null; // let the next try start again
    throw err;
  });
  return visionPromise;
}

/**
 * Starts downloading the WASM runtime and one model in the background, so the camera starts quickly.
 * Skipped when the browser asks to save data. Never throws: creating the tracker downloads anyway.
 */
export function preloadPoseModel(variant: ModelVariant): void {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (saveData) return;
  void (async () => {
    const { fileset } = await loadVision();
    // The WASM files come from a CDN with a 1-year browser cache: reading them now fills that cache.
    const warm = (url: string) => fetch(url).then((response) => response.arrayBuffer());
    await Promise.all([warm(fileset.wasmLoaderPath), warm(fileset.wasmBinaryPath), cachedDownload(MODELS[variant])]);
  })().catch((err) => console.warn('Pose model preload failed; it loads when the camera starts', err));
  void forgetOtherFiles(Object.values(MODELS)).catch(() => undefined);
}

/** Calls back while the model downloads (see watchDownload). Returns a function that stops listening. */
export function watchModelDownload(variant: ModelVariant, listener: (progress: DownloadProgress) => void): () => void {
  return watchDownload(MODELS[variant], listener);
}

/**
 * Loads the model. Tries the GPU first and falls back to the CPU.
 * @param variant 'heavy' (most accurate), 'full' or 'lite' (fastest)
 * @param mode 'VIDEO' (live / clips) or 'IMAGE' (single photos, see /tools/image-check)
 */
export async function createPoseTracker(
  variant: ModelVariant = 'full',
  mode: 'VIDEO' | 'IMAGE' = 'VIDEO',
): Promise<PoseTracker> {
  const [{ library, fileset }, model] = await Promise.all([loadVision(), cachedDownload(MODELS[variant])]);
  const { PoseLandmarker } = library;

  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetBuffer: model, delegate },
    runningMode: mode,
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  let landmarker: PoseLandmarkerType;
  let delegate: 'GPU' | 'CPU' = 'GPU';
  try {
    // Without WebGL2 the GPU model still loads but then fails on every frame (nothing is judged,
    // no error shown), so go straight to the CPU. Seen in a browser without graphics, 2026-10-13.
    if (!hasWebGL2()) throw new Error('WebGL2 not available');
    landmarker = await PoseLandmarker.createFromOptions(fileset, options('GPU'));
  } catch (err) {
    console.warn('GPU pose model failed, using CPU', err);
    delegate = 'CPU';
    landmarker = await PoseLandmarker.createFromOptions(fileset, options('CPU'));
  }

  let lastTimestamp = 0;
  return {
    delegate,
    detect(video) {
      // MediaPipe needs strictly increasing timestamps.
      const ts = Math.max(lastTimestamp + 1, performance.now());
      lastTimestamp = ts;
      const result = landmarker.detectForVideo(video, ts);
      return result.landmarks?.[0] ?? null;
    },
    detectImage(image) {
      return landmarker.detect(image).landmarks?.[0] ?? null;
    },
    close() {
      landmarker.close();
    },
  };
}

/** Can this browser create a WebGL2 context (what MediaPipe's GPU model draws with)? */
function hasWebGL2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}
