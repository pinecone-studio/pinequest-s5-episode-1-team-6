// Cheer jump detector: toe touch, pike, herkie, tuck jump and spread eagle.
//
// When the athlete is in the air comes from the leap detector (lib/elements/splitLeap.ts: hips up and
// feet off the floor, then back down), so take-off and landing work exactly as for gymnastics leaps.
// This detector keeps its own frames of each flight and, near the top of the jump (hips within the
// top 30% of the rise), names the shape of each frame. The majority decides which jump it was; the
// best frame of that shape is judged against the rubric (lib/cheer/rules.ts).
//
// Measured in the image plane, so each jump has a camera direction: the straddle jumps (toe touch,
// herkie, spread eagle) from the front, the pike and tuck from the side. The other direction gives a warning.

import {
  ARM_POINTS, LEG_POINTS, LM, armElevation, armPoints, dist, kneeAngle, legElevation, mid,
  minVisibility, torsoLength, type Landmarks,
} from '../geometry';
import { SplitLeapDetector, type DetectorFrame } from '../elements/splitLeap';
import type { ElementEvent, Penalty } from '../types';
import { CHEER_JUMPS, CHEER_LIMITS, cheerBand, type CheerElementRule } from './rules';

export const CHEER_JUMP_SETTINGS = {
  minVisibility: 0.5,
  minFlightMs: 100,
  maxFlightMs: 1500,
  peakWindow: 0.7, // frames with hip rise >= 70% of the jump's highest rise count as "the top"
  straightKnee: 130, // a leg counts as straight for naming the shape (judged straight at 155°, #C4)
  bentKnee: 120, // a leg counts as bent (tuck, herkie's under leg)
  tuckKnee: 110,
  apartX: 0.3, // straddle: each knee at least 0.3 torso lengths out to its side of the hips
  togetherX: 0.35, // pike: knees within 0.35 torso lengths of each other across the picture
  liftedDeg: 55, // a lifted leg: at least 55° up from straight down (toe touch, pike)
  eagleMinDeg: 20, // spread eagle: legs apart 20-55° from straight down
  tuckMinDeg: 45, // tuck: both thighs at least this high to count as a tuck attempt
  herkieUnderMaxDeg: 60, // herkie: the bent leg stays low
  facingWidth: 0.35, // shoulders apart / torso: at least this when facing the camera...
  sideWidth: 0.4, // ...and at most this when side-on
};
export type CheerJumpSettings = typeof CHEER_JUMP_SETTINGS;

export type JumpShape = 'toeTouch' | 'pike' | 'herkie' | 'tuck' | 'spreadEagle';

const RULES: Record<JumpShape, CheerElementRule> = {
  toeTouch: CHEER_JUMPS.TOE_TOUCH,
  pike: CHEER_JUMPS.PIKE,
  herkie: CHEER_JUMPS.HERKIE,
  tuck: CHEER_JUMPS.TUCK,
  spreadEagle: CHEER_JUMPS.SPREAD_EAGLE,
};

/** One frame in the air, measured. */
export interface JumpFrame {
  t: number;
  hipY: number;
  legDeg: [number, number]; // each thigh (hip -> knee) from straight down: 0 down, 90 level
  kneeDeg: [number, number]; // 180 = straight
  kneeX: [number, number]; // each knee across the picture from the middle of the hips, in torso lengths
  armDeg: [number, number] | null; // each arm from straight down, null when the arms can't be seen
  width: number; // shoulders apart / torso (facing the camera or side-on)
  visibility: number;
}

/** The jump shape of one frame, or null. */
export function jumpShape(f: JumpFrame, s: CheerJumpSettings = CHEER_JUMP_SETTINGS): JumpShape | null {
  const [legL, legR] = f.legDeg;
  const [kneeL, kneeR] = f.kneeDeg;
  const straddle = f.kneeX[0] * f.kneeX[1] < 0 && Math.min(Math.abs(f.kneeX[0]), Math.abs(f.kneeX[1])) >= s.apartX;
  const together = Math.abs(f.kneeX[0] - f.kneeX[1]) <= s.togetherX;
  const bothStraight = Math.min(kneeL, kneeR) >= s.straightKnee;

  if (kneeL <= s.tuckKnee && kneeR <= s.tuckKnee && Math.min(legL, legR) >= s.tuckMinDeg) return 'tuck';
  // Herkie: one straight leg up and out to its side, the other bent and low.
  const straightSide = kneeL >= s.straightKnee && kneeR <= s.bentKnee ? 0 : kneeR >= s.straightKnee && kneeL <= s.bentKnee ? 1 : null;
  if (straightSide !== null) {
    const up = f.legDeg[straightSide];
    const under = f.legDeg[straightSide === 0 ? 1 : 0];
    if (up >= s.liftedDeg && under <= s.herkieUnderMaxDeg && Math.abs(f.kneeX[straightSide]) >= s.apartX) return 'herkie';
  }
  if (!bothStraight) return null;
  const low = Math.min(legL, legR);
  if (straddle && low >= s.liftedDeg) return 'toeTouch';
  if (straddle && low >= s.eagleMinDeg) return 'spreadEagle';
  if (together && low >= s.liftedDeg) return 'pike';
  return null;
}

export class CheerJumpDetector {
  private onEvent: (event: ElementEvent) => void;
  private s: CheerJumpSettings;
  // Only used to tell when the athlete is in the air; its split / stag leap calls are ignored.
  private flight = new SplitLeapDetector(() => {});
  private frames: JumpFrame[] = [];
  private tStart = 0;
  private groundHipY: number | null = null; // hip height on the last frame on the floor
  live = { airborne: false, shape: null as JumpShape | null };

  constructor(onEvent: (event: ElementEvent) => void, settings = CHEER_JUMP_SETTINGS) {
    this.onEvent = onEvent;
    this.s = settings;
  }

  reset(): void {
    this.flight.reset();
    this.frames = [];
    this.groundHipY = null;
    this.live = { airborne: false, shape: null };
  }

  update({ t, lm }: DetectorFrame): void {
    const wasAirborne = this.live.airborne;
    this.flight.update({ t, lm });
    const airborne = this.flight.live.airborne;

    if (airborne && !wasAirborne) {
      this.frames = [];
      this.tStart = t;
    }
    const frame = lm && airborne ? this.measure(t, lm) : null;
    if (frame) this.frames.push(frame);
    if (!airborne && wasAirborne) this.finish(t);
    if (!airborne && lm) this.groundHipY = mid(lm[LM.L_HIP], lm[LM.R_HIP]).y;

    this.live = { airborne, shape: frame ? jumpShape(frame, this.s) : null };
  }

  private measure(t: number, lm: Landmarks): JumpFrame | null {
    const visibility = minVisibility(lm, LEG_POINTS);
    const torso = torsoLength(lm);
    if (visibility < this.s.minVisibility || torso < 1) return null;
    const hips = mid(lm[LM.L_HIP], lm[LM.R_HIP]);
    const armsSeen = minVisibility(lm, ARM_POINTS) >= this.s.minVisibility;
    return {
      t,
      hipY: hips.y,
      legDeg: [legElevation(lm[LM.L_HIP], lm[LM.L_KNEE]), legElevation(lm[LM.R_HIP], lm[LM.R_KNEE])],
      kneeDeg: [kneeAngle(lm, 'L'), kneeAngle(lm, 'R')],
      kneeX: [(lm[LM.L_KNEE].x - hips.x) / torso, (lm[LM.R_KNEE].x - hips.x) / torso],
      armDeg: armsSeen ? [armElevation(armPoints(lm, 'L')), armElevation(armPoints(lm, 'R'))] : null,
      width: dist(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]) / torso,
      visibility,
    };
  }

  private finish(tLand: number): void {
    const frames = this.frames;
    this.frames = [];
    const flightMs = tLand - this.tStart;
    if (frames.length === 0 || flightMs < this.s.minFlightMs || flightMs > this.s.maxFlightMs) return;

    // The top of the jump: frames whose hips rose at least 70% of the highest rise.
    const ground = this.groundHipY ?? Math.max(...frames.map((f) => f.hipY));
    const rise = (f: JumpFrame) => ground - f.hipY;
    const maxRise = Math.max(...frames.map(rise));
    const top = frames.filter((f) => rise(f) >= this.s.peakWindow * maxRise);

    // Which jump? The shape seen most often at the top.
    const counts = new Map<JumpShape, JumpFrame[]>();
    for (const f of top) {
      const shape = jumpShape(f, this.s);
      if (shape) counts.set(shape, [...(counts.get(shape) ?? []), f]);
    }
    if (counts.size === 0) return; // a straight jump, or a shape we don't know
    const [shape, shaped] = [...counts.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    const best = shaped.reduce((a, b) => (legHeight(shape, b) > legHeight(shape, a) ? b : a));
    this.onEvent(judgeJump(shape, best, this.tStart, tLand, flightMs, this.s));
  }
}

/** The leg height judged for a jump: the straight leg in a herkie, the lower leg otherwise. */
function legHeight(shape: JumpShape, f: JumpFrame): number {
  if (shape === 'herkie') return f.kneeDeg[0] >= f.kneeDeg[1] ? f.legDeg[0] : f.legDeg[1];
  return Math.min(...f.legDeg);
}

/** Turns the best frame of a jump into a judged event using the cheer rubric. */
export function judgeJump(
  shape: JumpShape,
  f: JumpFrame,
  tStart: number,
  tEnd: number,
  flightMs: number,
  s: CheerJumpSettings = CHEER_JUMP_SETTINGS,
): ElementEvent {
  const rule = RULES[shape];
  const penalties: Penalty[] = [];
  const height = legHeight(shape, f);
  const isTuck = shape === 'tuck';

  // Legs (or the knees, in a tuck) at least level with the hips (#C3, #C5). A spread eagle has no height.
  let credited = true;
  if (shape !== 'spreadEagle') {
    const band = cheerBand(90 - height);
    credited = band.creditsDifficulty;
    if (band.penalty > 0) {
      penalties.push({
        reason: `${isTuck ? 'Knees' : 'Legs'} ${band.measuredDeg}° below hip height (${band.deg}° after the 3° camera margin)`,
        value: band.penalty,
        ref: isTuck ? '#C5 Cheer rubric' : '#C3 Cheer rubric',
        segment: isTuck ? 'tuckKnees' : 'jumpLegs',
        measuredDeg: band.measuredDeg,
        band: band.band,
      });
    }
  }

  // Straight knees in the straight-leg jumps (#C4). A herkie's under leg is bent on purpose.
  const knees = shape === 'herkie' ? [Math.max(...f.kneeDeg)] : isTuck ? [] : f.kneeDeg;
  for (const knee of knees) {
    if (knee < CHEER_LIMITS.straightKneeDeg) {
      penalties.push({
        reason: `Bent knee at the top of the jump: ${Math.round(knee)}° (straight = 180°)`,
        value: CHEER_LIMITS.bentLimbPenalty,
        ref: '#C4 Cheer rubric',
        segment: 'jumpKnees',
        measuredDeg: Math.round(180 - knee),
      });
    }
  }

  // Arms: a T in a toe touch, a High V in a spread eagle (#C6).
  const armTarget = shape === 'toeTouch' ? 90 : shape === 'spreadEagle' ? 135 : null;
  if (armTarget !== null && f.armDeg) {
    const off = Math.max(...f.armDeg.map((a) => Math.abs(a - armTarget)));
    const band = cheerBand(off);
    if (band.deg > CHEER_LIMITS.jumpArmsToleranceDeg) {
      penalties.push({
        reason: `Arms ${band.measuredDeg}° off the ${armTarget === 90 ? 'T' : 'High V'} at the top of the jump`,
        value: CHEER_LIMITS.jumpArmsPenalty,
        ref: '#C6 Cheer rubric',
        segment: 'jumpArms',
        measuredDeg: band.measuredDeg,
      });
    }
  }

  const warnings: string[] = [];
  const fromFront = shape === 'toeTouch' || shape === 'herkie' || shape === 'spreadEagle';
  if (fromFront && f.width < s.facingWidth) warnings.push('Camera not in front of the jump: leg angles unreliable');
  if ((shape === 'pike' || shape === 'tuck') && f.width > s.sideWidth) warnings.push(`Camera not side-on to the ${shape}: leg angles unreliable`);
  if (f.visibility < 0.7) warnings.push('Legs partly hidden: low confidence');
  warnings.push('Pointed toes and the landing are not measured: judges check them');
  warnings.push('Rubric values not yet checked by a cheer judge');

  return {
    element: rule.name,
    code: rule.code,
    t: f.t,
    tStart,
    tEnd,
    dbValid: credited,
    dbValue: credited ? rule.value : 0,
    penalties,
    measurements: {
      legHeightDeg: Math.round(height),
      kneeDeg: Math.round(Math.min(...f.kneeDeg)),
      ...(f.armDeg ? { leftArmDeg: Math.round(f.armDeg[0]), rightArmDeg: Math.round(f.armDeg[1]) } : {}),
      flightMs: Math.round(flightMs),
    },
    confidence: Math.round(f.visibility * 10) / 10,
    warnings,
    requirement: rule.requirement,
    ruleRef: rule.ref,
  };
}
