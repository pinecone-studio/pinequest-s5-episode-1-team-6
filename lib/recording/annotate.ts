// Marks the move on its video, so you see where and when points were lost (or that it was right):
//   - a strip along the top (the player's buttons cover the bottom): the whole clip, the move itself
//     (red if it lost points, green if not), and where you are;
//   - during the move: the body part that lost points drawn in red with a tag ("Thigh 6° low −0.10"),
//     and a badge "Points lost here −0.40" (with mistakes that have no body part, like a short hold);
//     a correct move gets a green badge "Correct: no points lost".
// clipCutter.ts calls drawMistakeMarks on every frame of the clip and on the photo.

import { LM, mid, type Landmark, type Landmarks } from '../geometry';

export interface Mistake {
  segment: string; // Penalty.segment: 'thigh', 'trunk', 'split', 'foot', 'hold', ...
  label: string; // "Thigh 6° low −0.10"
}

export interface MistakeMarks {
  mistakes: Mistake[];
  pointsLost: number;
  clipFromMs: number; // recording times
  clipToMs: number;
  holdFromMs: number;
  holdToMs: number;
}

type Bone = [Landmark, Landmark];

const RED = 'rgba(240, 64, 80, 0.95)';
const GREEN = 'rgba(31, 160, 90, 0.95)';

/**
 * The bones to draw red for one deduction, or [] when it is not about a body part (a short hold).
 * The raised leg is the one whose ankle is higher in the picture.
 */
export function bonesFor(segment: string, lm: Landmarks): Bone[] {
  const leftUp = lm[LM.L_ANKLE].y < lm[LM.R_ANKLE].y;
  const raised = leftUp
    ? { hip: lm[LM.L_HIP], knee: lm[LM.L_KNEE], ankle: lm[LM.L_ANKLE], foot: lm[LM.L_FOOT] }
    : { hip: lm[LM.R_HIP], knee: lm[LM.R_KNEE], ankle: lm[LM.R_ANKLE], foot: lm[LM.R_FOOT] };
  const leg = (s: 'L' | 'R'): Bone[] => [
    [lm[LM[`${s}_HIP`]], lm[LM[`${s}_KNEE`]]],
    [lm[LM[`${s}_KNEE`]], lm[LM[`${s}_ANKLE`]]],
  ];
  switch (segment) {
    case 'split':
    case 'leapSplit':
      return [...leg('L'), ...leg('R')];
    case 'thigh':
    case 'passeThigh':
      return [[raised.hip, raised.knee]];
    case 'trunk':
    case 'trunkAbove':
      return [[mid(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]), mid(lm[LM.L_HIP], lm[LM.R_HIP])]];
    case 'foot':
      return [[raised.knee, raised.ankle], [raised.ankle, raised.foot]];
    default:
      return [];
  }
}

/** Is recording time `recMs` inside the move itself? */
export function inMistake(marks: MistakeMarks, recMs: number): boolean {
  return recMs >= marks.holdFromMs && recMs <= marks.holdToMs;
}

/**
 * Draws the marks on one frame.
 * @param lm landmarks of this frame in the original video's pixels, or null
 * @param scale original video pixels -> this canvas
 */
export function drawMistakeMarks(
  ctx: CanvasRenderingContext2D,
  lm: Landmarks | null,
  scale: number,
  marks: MistakeMarks,
  recMs: number,
): void {
  const u = ctx.canvas.width / 640; // sizes grow with the video
  const correct = marks.mistakes.length === 0;
  drawStrip(ctx, marks, recMs, u, correct ? GREEN : RED);
  if (!inMistake(marks, recMs)) return;
  if (correct) {
    badge(ctx, ['Correct: no points lost'], u, GREEN);
    return;
  }

  const loose: string[] = []; // mistakes without a body part: listed in the badge
  for (const mistake of marks.mistakes) {
    const bones = lm ? bonesFor(mistake.segment, lm) : [];
    if (bones.length === 0) {
      loose.push(mistake.label);
      continue;
    }
    const at = (p: Landmark) => ({ x: p.x * scale, y: p.y * scale });
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = RED;
    ctx.lineWidth = 9 * u;
    ctx.shadowColor = 'rgba(240, 64, 80, 0.8)';
    ctx.shadowBlur = 10 * u;
    for (const [a, b] of bones) {
      ctx.beginPath();
      ctx.moveTo(at(a).x, at(a).y);
      ctx.lineTo(at(b).x, at(b).y);
      ctx.stroke();
    }
    ctx.restore();
    const [a, b] = bones[0];
    tag(ctx, mistake.label, (at(a).x + at(b).x) / 2 + 12 * u, (at(a).y + at(b).y) / 2, u);
  }
  badge(ctx, [`Points lost here  −${marks.pointsLost.toFixed(2)}`, ...loose], u, RED);
}

/** Height of the strip along the top. */
const STRIP = 8;

/** Top strip: clip length, the move in `color` (red: lost points, green: correct), a white line where you are. */
function drawStrip(ctx: CanvasRenderingContext2D, marks: MistakeMarks, recMs: number, u: number, color: string): void {
  const { width } = ctx.canvas;
  const length = Math.max(1, marks.clipToMs - marks.clipFromMs);
  const x = (ms: number) => ((ms - marks.clipFromMs) / length) * width;
  const h = STRIP * u;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, width, h);
  ctx.fillStyle = color;
  ctx.fillRect(x(marks.holdFromMs), 0, Math.max(2, x(marks.holdToMs) - x(marks.holdFromMs)), h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.min(width - 3 * u, Math.max(0, x(recMs))), 0, 3 * u, h + 4 * u);
}

/** Red tag next to a body part. */
function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, u: number): void {
  ctx.font = `700 ${Math.round(15 * u)}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 14 * u;
  const h = 24 * u;
  const left = Math.min(Math.max(4 * u, x), ctx.canvas.width - w - 4 * u); // stay inside the picture
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.roundRect(left, y - h / 2, w, h, 6 * u);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, left + 7 * u, y);
}

/** Badge in the top-left corner, one line per entry. */
function badge(ctx: CanvasRenderingContext2D, lines: string[], u: number, color: string): void {
  ctx.font = `700 ${Math.round(17 * u)}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  const lineH = 26 * u;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 24 * u;
  ctx.fillStyle = color;
  ctx.beginPath();
  const top = (STRIP + 12) * u; // below the strip
  ctx.roundRect(12 * u, top, w, lineH * lines.length + 10 * u, 8 * u);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  lines.forEach((line, i) => ctx.fillText(line, 24 * u, top + 5 * u + lineH * (i + 0.5)));
}
