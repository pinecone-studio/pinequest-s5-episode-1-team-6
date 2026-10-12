// Draws the skeleton overlay on a canvas the same size as the video frame.

import { LM, type Landmarks } from './geometry';

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
