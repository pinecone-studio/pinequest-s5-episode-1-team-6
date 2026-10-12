// One Euro filter: removes keypoint jitter while still following fast moves.
// Casiez, Roussel, Vogel (CHI 2012). https://gery.casiez.net/1euro/
//
// Low speed  -> strong smoothing (no jitter while holding a balance).
// High speed -> light smoothing (little lag during a leap).

import type { Landmark } from './geometry';

export interface OneEuroOptions {
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
}

function smoothingFactor(dtSeconds: number, cutoffHz: number): number {
  const r = 2 * Math.PI * cutoffHz * dtSeconds;
  return r / (r + 1);
}

export class OneEuroFilter {
  minCutoff: number;
  beta: number;
  dCutoff: number;
  private prevValue: number | null = null;
  private prevDeriv = 0;
  private prevTime = 0;

  constructor({ minCutoff = 1.5, beta = 0.01, dCutoff = 1.0 }: OneEuroOptions = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  /** @param timeSeconds must increase */
  filter(value: number, timeSeconds: number): number {
    if (this.prevValue === null || timeSeconds <= this.prevTime) {
      this.prevValue = value;
      this.prevTime = timeSeconds;
      return value;
    }
    const dt = timeSeconds - this.prevTime;
    const deriv = (value - this.prevValue) / dt;
    const aD = smoothingFactor(dt, this.dCutoff);
    const smoothDeriv = aD * deriv + (1 - aD) * this.prevDeriv;

    const cutoff = this.minCutoff + this.beta * Math.abs(smoothDeriv);
    const a = smoothingFactor(dt, cutoff);
    const smoothValue = a * value + (1 - a) * this.prevValue;

    this.prevValue = smoothValue;
    this.prevDeriv = smoothDeriv;
    this.prevTime = timeSeconds;
    return smoothValue;
  }
}

/** Smooths x and y of every landmark with its own pair of One Euro filters. */
export class LandmarkSmoother {
  private options?: OneEuroOptions;
  private filters: { x: OneEuroFilter; y: OneEuroFilter }[] = [];

  constructor(options?: OneEuroOptions) {
    this.options = options;
  }

  reset(): void {
    this.filters = [];
  }

  /** @param landmarks array of {x, y, visibility} in pixels */
  smooth(landmarks: Landmark[], timeSeconds: number): Landmark[] {
    return landmarks.map((p, i) => {
      if (!this.filters[i]) {
        this.filters[i] = {
          x: new OneEuroFilter(this.options),
          y: new OneEuroFilter(this.options),
        };
      }
      return {
        x: this.filters[i].x.filter(p.x, timeSeconds),
        y: this.filters[i].y.filter(p.y, timeSeconds),
        visibility: p.visibility,
      };
    });
  }
}
