// Draws the skeleton overlay on a canvas the same size as the video frame.

import { LM, jointAngle, mid, minVisibility, splitAngle, type Landmarks, type Point } from './geometry';
import { deviationBand } from './rules';
import type { Band } from './types';

const BONES: [number, number][] = [
  [LM.L_SHOULDER, LM.R_SHOULDER], [LM.L_HIP, LM.R_HIP],
  [LM.L_SHOULDER, LM.L_HIP], [LM.R_SHOULDER, LM.R_HIP],
  [11, 13], [13, 15], [12, 14], [14, 16], // arms
];
const LEG_BONES: [number, number][] = [
  [LM.L_HIP, LM.L_KNEE], [LM.L_KNEE, LM.L_ANKLE], [LM.L_ANKLE, LM.L_HEEL], [LM.L_ANKLE, LM.L_FOOT],
  [LM.R_HIP, LM.R_KNEE], [LM.R_KNEE, LM.R_ANKLE], [LM.R_ANKLE, LM.R_HEEL], [LM.R_ANKLE, LM.R_FOOT],
];

const MIN_VISIBILITY = 0.3;

/**
 * @param ctx canvas 2D context
 * @param lm landmarks in pixels, or null
 * @param legColor color for the legs (shows what the rules are looking at)
 */
export function drawSkeleton(ctx: CanvasRenderingContext2D, lm: Landmarks | null, legColor = '#d9bd84'): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!lm) return;
  const scale = Math.max(ctx.canvas.width, ctx.canvas.height) / 640;

  const line = (bones: [number, number][], color: string, width: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width * scale;
    ctx.lineCap = 'round';
    for (const [a, b] of bones) {
      if ((lm[a].visibility ?? 0) < MIN_VISIBILITY || (lm[b].visibility ?? 0) < MIN_VISIBILITY) continue;
      ctx.beginPath();
      ctx.moveTo(lm[a].x, lm[a].y);
      ctx.lineTo(lm[b].x, lm[b].y);
      ctx.stroke();
    }
  };
  line(BONES, 'rgba(255,255,255,0.9)', 2);
  line(LEG_BONES, legColor, 3.5);

  ctx.fillStyle = '#ffffff';
  for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    if ((lm[i].visibility ?? 0) < MIN_VISIBILITY) continue;
    ctx.beginPath();
    ctx.arc(lm[i].x, lm[i].y, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Label colors by how far the angle is from a straight 180°, same bands as the deductions (rules.ts). */
const BAND_COLORS: Record<Band, string> = {
  none: '#4cc38a', // green: straight
  small: '#4cc38a', // green: within 10°
  medium: '#f2b544', // amber: 11-20° short
  large: '#f0606e', // red: more than 20° short
};

export interface LegAngle {
  at: Point; // where the label goes, in pixels
  deg: number; // measured angle, rounded
  color: string;
}

/**
 * The leg angles a student can work on, for Practice: the split between the legs (at the hips)
 * and how straight each knee is. 180° is the target for all three. Parts the pose model can't see
 * well are left out. 2D only: the split is only right when the camera sees it side-on.
 */
export function legAngles(lm: Landmarks): LegAngle[] {
  const angles: LegAngle[] = [];
  const add = (at: Point, deg: number) => {
    const rounded = Math.round(deg);
    angles.push({ at, deg: rounded, color: BAND_COLORS[deviationBand(180 - rounded).band] });
  };
  const legs = [LM.L_HIP, LM.R_HIP, LM.L_ANKLE, LM.R_ANKLE];
  if (minVisibility(lm, [...legs, LM.L_SHOULDER, LM.R_SHOULDER]) >= MIN_VISIBILITY) {
    add(mid(lm[LM.L_HIP], lm[LM.R_HIP]), splitAngle(lm));
  }
  for (const [hip, knee, ankle] of [[LM.L_HIP, LM.L_KNEE, LM.L_ANKLE], [LM.R_HIP, LM.R_KNEE, LM.R_ANKLE]]) {
    if (minVisibility(lm, [hip, knee, ankle]) < MIN_VISIBILITY) continue;
    add(lm[knee], jointAngle(lm[hip], lm[knee], lm[ankle]));
  }
  return angles;
}

/** How big the angle labels are: 1 = small, 1.5 = easy to read from a few metres away. */
const LABEL_SIZE = 1.5;

/** Draws the leg angles as labels next to the joints. Call after drawSkeleton. */
export function drawLegAngles(ctx: CanvasRenderingContext2D, lm: Landmarks | null): void {
  if (!lm) return;
  // LABEL_SIZE sets the whole label (text, box, gap); it grows with the video like the skeleton.
  const scale = (Math.max(ctx.canvas.width, ctx.canvas.height) / 640) * LABEL_SIZE;
  ctx.font = `700 ${Math.round(12 * scale)}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  for (const { at, deg, color } of legAngles(lm)) {
    const text = `${deg}°`;
    const w = ctx.measureText(text).width + 10 * scale;
    const h = 18 * scale;
    const x = at.x + 8 * scale; // beside the joint, not on top of it
    const y = at.y - h / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 5 * scale);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(text, x + 5 * scale, at.y);
  }
}
