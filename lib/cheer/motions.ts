// Cheer motion detector: High V, Low V, T, touchdown, diagonal, L motion, punch and broken T.
//
// A motion is an arm position that is "hit" sharply and held for a moment. Every frame, both arms are
// compared with each motion's target (arm angle from straight down: 0 = down, 90 = a T, 180 = up).
// The closest motion within CAPTURE_DEG on both arms is the one being shown. Held for at least
// CHEER_LIMITS.motionMinHoldMs, it is judged when the arms leave it: the median arm angles of the hold
// against the targets (placement, #C1) and straight elbows (#C2).
//
// Motions are shown to the crowd, so the athlete faces the camera: the arm angles are measured in the
// image plane, which is right only from the front. Frames seen from the side are skipped.

import {
  ARM_POINTS, LM, armElevation, armPoints, armPointsOutward, dist, elbowAngle, legElevation,
  minVisibility, torsoLength, type Landmarks, type Side,
} from '../geometry';
import type { ElementEvent, Penalty } from '../types';
import type { DetectorFrame } from '../elements/splitLeap';
import { CHEER_LIMITS, CHEER_MOTIONS, cheerBand, type CheerElementRule } from './rules';

export const MOTION_SETTINGS = {
  minVisibility: 0.5,
  captureDeg: 25, // an arm within 25° of a motion's target counts as trying that motion
  minFacing: 0.35, // shoulder width / torso length: below this the athlete is side-on to the camera
  straightishElbowDeg: 120, // a "straight arm" motion is not tried with the elbow bent more than this
  brokenTMaxElbowDeg: 110, // broken T: the elbow clearly bent
  hipMaxDist: 0.45, // punch: the hand on the hip = wrist within 0.45 torso lengths of the hip
  hipMaxElbowDeg: 140, // ...with the elbow bent
  gapToleranceMs: 150, // brief tracking glitches don't end the motion
};
export type MotionSettings = typeof MOTION_SETTINGS;

/** What one arm should do in a motion. */
type ArmTarget =
  | { kind: 'straight'; deg: number } // straight arm at this angle from straight down
  | { kind: 'bent'; upperDeg: number } // upper arm at this angle, elbow bent (broken T)
  | { kind: 'hip' }; // hand on the hip (punch)

interface MotionShape {
  id: string; // shape + side, e.g. 'diagonal-L' (left arm high)
  rule: CheerElementRule;
  left: ArmTarget;
  right: ArmTarget;
}

const straight = (deg: number): ArmTarget => ({ kind: 'straight', deg });

/** Every motion, with its mirror image for the one-sided ones. */
export const MOTION_SHAPES: MotionShape[] = [
  { id: 'highV', rule: CHEER_MOTIONS.HIGH_V, left: straight(135), right: straight(135) },
  { id: 'lowV', rule: CHEER_MOTIONS.LOW_V, left: straight(45), right: straight(45) },
  { id: 't', rule: CHEER_MOTIONS.T, left: straight(90), right: straight(90) },
  { id: 'touchdown', rule: CHEER_MOTIONS.TOUCHDOWN, left: straight(180), right: straight(180) },
  { id: 'brokenT', rule: CHEER_MOTIONS.BROKEN_T, left: { kind: 'bent', upperDeg: 90 }, right: { kind: 'bent', upperDeg: 90 } },
  ...mirrored('diagonal', CHEER_MOTIONS.DIAGONAL, straight(135), straight(45)),
  ...mirrored('lMotion', CHEER_MOTIONS.L_MOTION, straight(180), straight(90)),
  ...mirrored('punch', CHEER_MOTIONS.PUNCH, straight(180), { kind: 'hip' }),
];

/** A one-sided motion done with either arm: `first` is the arm named in the id ('-L' = left arm). */
function mirrored(id: string, rule: CheerElementRule, first: ArmTarget, other: ArmTarget): MotionShape[] {
  return [
    { id: `${id}-L`, rule, left: first, right: other },
    { id: `${id}-R`, rule, left: other, right: first },
  ];
}

/** One arm, measured. */
interface ArmMeasure {
  deg: number; // shoulder -> wrist, 0 = down, 180 = up
  upperDeg: number; // shoulder -> elbow
  elbowDeg: number; // 180 = straight
  outward: boolean; // the hand is on its own side of the body
  hipDist: number; // wrist to the same side's hip, in torso lengths
}

interface MotionFrame {
  t: number;
  left: ArmMeasure;
  right: ArmMeasure;
  visibility: number;
}

interface Hold {
  shape: MotionShape;
  tStart: number;
  lastSeen: number;
  frames: MotionFrame[];
}

export interface MotionLive {
  shape: string | null; // MotionShape id
  name: string | null;
  holdMs: number;
  penalties: Penalty[]; // what it would lose if it ended now
  hint: string | null;
}

const IDLE: MotionLive = { shape: null, name: null, holdMs: 0, penalties: [], hint: null };

export class MotionDetector {
  private onEvent: (event: ElementEvent) => void;
  private s: MotionSettings;
  private hold: Hold | null = null;
  live: MotionLive = IDLE;

  constructor(onEvent: (event: ElementEvent) => void, settings = MOTION_SETTINGS) {
    this.onEvent = onEvent;
    this.s = settings;
  }

  reset(): void {
    this.hold = null;
    this.live = IDLE;
  }

  /** Judge a motion still being held (Finish pressed). */
  flush(): void {
    this.close();
  }

  update({ t, lm, airborne }: DetectorFrame): void {
    const seen = lm ? this.measure(t, lm) : null;
    // In the air the arms belong to the jump, not to a motion.
    const match = seen && !airborne ? this.match(seen) : null;

    if (match && this.hold?.shape.id === match.id) {
      this.hold.frames.push(seen!);
      this.hold.lastSeen = t;
    } else if (match) {
      this.close();
      this.hold = { shape: match, tStart: t, lastSeen: t, frames: [seen!] };
    } else if (this.hold && t - this.hold.lastSeen > this.s.gapToleranceMs) {
      this.close();
    }

    if (this.hold) {
      this.live = {
        shape: this.hold.shape.id,
        name: this.hold.shape.rule.name,
        holdMs: this.hold.lastSeen - this.hold.tStart,
        penalties: judgeArms(this.hold.shape, this.hold.frames.slice(-5)),
        hint: null,
      };
    } else {
      this.live = { ...IDLE, hint: lm ? this.hint(lm) : 'Step into the camera view' };
    }
  }

  /** Both arms of one frame, or null when they can't be trusted. */
  private measure(t: number, lm: Landmarks): MotionFrame | null {
    const visibility = minVisibility(lm, [...ARM_POINTS, LM.L_HIP, LM.R_HIP]);
    const torso = torsoLength(lm);
    if (visibility < this.s.minVisibility || torso < 1) return null;
    if (!facingCamera(lm, this.s.minFacing)) return null;
    const arm = (side: Side): ArmMeasure => {
      const a = armPoints(lm, side);
      return {
        deg: armElevation(a),
        upperDeg: legElevation(a.shoulder, a.elbow),
        elbowDeg: elbowAngle(a),
        outward: armPointsOutward(lm, a),
        hipDist: dist(a.wrist, lm[side === 'L' ? LM.L_HIP : LM.R_HIP]) / torso,
      };
    };
    return { t, left: arm('L'), right: arm('R'), visibility };
  }

  /** The motion closest to this frame's arms, or null when none is close enough. */
  private match(frame: MotionFrame): MotionShape | null {
    let best: MotionShape | null = null;
    let bestDev = Infinity;
    for (const shape of MOTION_SHAPES) {
      const l = this.armDeviation(shape.left, frame.left);
      const r = this.armDeviation(shape.right, frame.right);
      if (l > this.s.captureDeg || r > this.s.captureDeg) continue;
      if (l + r < bestDev) {
        best = shape;
        bestDev = l + r;
      }
    }
    return best;
  }

  /** How far one arm is from its target (Infinity when it is not even trying). */
  private armDeviation(target: ArmTarget, arm: ArmMeasure): number {
    switch (target.kind) {
      case 'straight':
        if (arm.elbowDeg < this.s.straightishElbowDeg) return Infinity;
        // Out to the side, not across the body (straight up can lean either way).
        if (target.deg < 160 && !arm.outward) return Infinity;
        return Math.abs(arm.deg - target.deg);
      case 'bent':
        if (arm.elbowDeg > this.s.brokenTMaxElbowDeg || !arm.outward) return Infinity;
        return Math.abs(arm.upperDeg - target.upperDeg);
      case 'hip':
        return arm.hipDist <= this.s.hipMaxDist && arm.elbowDeg <= this.s.hipMaxElbowDeg ? 0 : Infinity;
    }
  }

  private hint(lm: Landmarks): string | null {
    if (minVisibility(lm, ARM_POINTS) < this.s.minVisibility) return 'Arms not visible: step back from the camera';
    if (!facingCamera(lm, this.s.minFacing)) return 'Face the camera';
    return null;
  }

  private close(): void {
    const hold = this.hold;
    this.hold = null;
    if (!hold) return;
    const holdMs = hold.lastSeen - hold.tStart;
    if (holdMs < CHEER_LIMITS.motionMinHoldMs) return; // passing through, not a motion
    this.onEvent(judgeMotion(hold.shape, hold.frames, hold.tStart, hold.lastSeen));
  }
}

/** Shoulders wide enough apart: the athlete faces (or has her back to) the camera. */
function facingCamera(lm: Landmarks, minFacing: number): boolean {
  const torso = torsoLength(lm);
  return torso > 0 && dist(lm[LM.L_SHOULDER], lm[LM.R_SHOULDER]) / torso >= minFacing;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

const SIDE_NAME: Record<Side, string> = { L: 'Left', R: 'Right' };

/** Deductions for both arms over some frames of a hold (median angles, so one bad frame doesn't count). */
function judgeArms(shape: MotionShape, frames: MotionFrame[]): Penalty[] {
  const penalties: Penalty[] = [];
  for (const side of ['L', 'R'] as const) {
    const target = side === 'L' ? shape.left : shape.right;
    const arms = frames.map((f) => (side === 'L' ? f.left : f.right));
    if (target.kind === 'hip') continue; // a hand on the hip is either there or not a punch
    const measured = median(arms.map((a) => (target.kind === 'straight' ? a.deg : a.upperDeg)));
    const targetDeg = target.kind === 'straight' ? target.deg : target.upperDeg;
    const band = cheerBand(Math.abs(measured - targetDeg));
    if (band.penalty > 0) {
      const low = measured < targetDeg;
      penalties.push({
        reason: `${SIDE_NAME[side]} arm ${band.measuredDeg}° ${low ? 'below' : 'above'} the ${shape.rule.name} position (${band.deg}° after the 3° camera margin)`,
        value: band.penalty,
        ref: '#C1 Cheer rubric',
        segment: `${side === 'L' ? 'left' : 'right'}Arm${low ? 'Low' : 'High'}`,
        measuredDeg: band.measuredDeg,
        band: band.band,
      });
    }
    if (target.kind === 'straight') {
      const elbow = median(arms.map((a) => a.elbowDeg));
      if (elbow < CHEER_LIMITS.straightElbowDeg) {
        penalties.push({
          reason: `${SIDE_NAME[side]} arm bent: elbow at ${Math.round(elbow)}° (straight = 180°)`,
          value: CHEER_LIMITS.bentLimbPenalty,
          ref: '#C2 Cheer rubric',
          segment: `${side === 'L' ? 'left' : 'right'}Elbow`,
          measuredDeg: Math.round(180 - elbow),
        });
      }
    }
  }
  return penalties;
}

/** Turns a held motion into a judged event. */
export function judgeMotion(shape: MotionShape, frames: MotionFrame[], tStart: number, tEnd: number): ElementEvent {
  const rule = shape.rule;
  const visibility = Math.min(...frames.map((f) => f.visibility));
  return {
    element: rule.name,
    code: rule.code,
    t: frames[Math.floor(frames.length / 2)].t,
    tStart,
    tEnd,
    dbValid: true,
    dbValue: rule.value, // 0: motions are judged on technique only
    penalties: judgeArms(shape, frames),
    measurements: {
      holdMs: Math.round(tEnd - tStart),
      leftArmDeg: Math.round(median(frames.map((f) => f.left.deg))),
      rightArmDeg: Math.round(median(frames.map((f) => f.right.deg))),
    },
    confidence: Math.round(visibility * 10) / 10,
    warnings: [
      ...(visibility < 0.7 ? ['Arms partly hidden: low confidence'] : []),
      'Rubric values not yet checked by a cheer judge',
    ],
    requirement: rule.requirement,
    ruleRef: rule.ref,
  };
}
