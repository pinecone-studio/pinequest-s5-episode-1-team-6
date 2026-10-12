// Pose signature: a short list of numbers that describes the SHAPE of a balance, independent
// of the gymnast's size, distance to the camera and which way she faces.
// The pose library (recognizer.ts) compares signatures to recognize poses from examples.

import { clamp } from '../geometry';
import type { BalanceFrame } from '../elements/balanceFrame';

// Order matters: stored library examples use this order. Change only together with the
// library version in recognizer.ts.
export const FEATURES = [
  { name: 'split', weight: 1 }, // angle between the legs
  { name: 'freeKnee', weight: 1.2 }, // straight (split shapes) vs bent (attitude)
  { name: 'thigh', weight: 1 }, // free thigh height
  { name: 'legUp', weight: 1 }, // free foot height around the hips
  { name: 'lean', weight: 1.2 }, // trunk lean, forward (+) or backward (-)
  { name: 'forward', weight: 2 }, // free leg in front of or behind the body
  { name: 'help', weight: 1.5 }, // hand on the free leg
  { name: 'footOverHip', weight: 0.8 }, // free ankle height above the hips
  { name: 'footOverHead', weight: 1 }, // lowest point of the foot vs the top of the head
  { name: 'raised', weight: 1.5 }, // free leg lifted at all
];

/** Signature of one frame, each value scaled to about 0..1. */
export function poseSignature(f: BalanceFrame): number[] {
  return [
    f.split / 360,
    f.freeKnee / 180,
    f.thighDeg / 180,
    f.legUp / 180,
    (clamp(f.lean, -90, 90) + 90) / 180,
    f.forward === null ? 0.5 : f.forward ? 1 : 0,
    f.help ? 1 : 0,
    (clamp(f.footOverHip, -1, 3) + 1) / 4,
    f.footOverHead === null ? 0.5 : (clamp(f.footOverHead, -2, 2) + 2) / 4,
    f.raised ? 1 : 0,
  ];
}
