// Pretrained pose model: Google MediaPipe Pose Landmarker, running in the browser.
// Nothing is trained here. The library comes from npm (pinned in package.json); its WASM files and
// the model weights load from pinned CDN URLs (no weights in git). The model returns 33 body
// landmarks per frame. Browser only: import this from client components.

import type { NormalizedLandmark, PoseLandmarker as PoseLandmarkerType } from '@mediapipe/tasks-vision';

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

/**
 * Loads the model. Tries the GPU first and falls back to the CPU.
 * @param variant 'heavy' (most accurate), 'full' or 'lite' (fastest)
 * @param mode 'VIDEO' (live / clips) or 'IMAGE' (single photos, see /tools/image-check)
 */
export async function createPoseTracker(
  variant: ModelVariant = 'full',
  mode: 'VIDEO' | 'IMAGE' = 'VIDEO',
): Promise<PoseTracker> {
  // Loaded on demand so the (large) library is only downloaded when the camera starts.
  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);

  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: MODELS[variant], delegate },
    runningMode: mode,
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  let landmarker: PoseLandmarkerType;
  let delegate: 'GPU' | 'CPU' = 'GPU';
  try {
    landmarker = await PoseLandmarker.createFromOptions(vision, options('GPU'));
  } catch (err) {
    console.warn('GPU pose model failed, using CPU', err);
    delegate = 'CPU';
    landmarker = await PoseLandmarker.createFromOptions(vision, options('CPU'));
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
