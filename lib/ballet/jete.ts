// Grand jeté detector: a big jump with the legs in a split at the top.
//
// The leap detector (lib/elements/splitLeap.ts) already finds take-off and landing, takes the frames
// near the top of the flight and measures the split there (both knees straight). Its split leap is a
// grand jeté in shape; this detector judges that measured split with the ballet rubric (#B7) instead
// of the gymnastics Code of Points. A stag-shaped leap is not a grand jeté and is left out.

import { SplitLeapDetector, type DetectorFrame } from '../elements/splitLeap';
import { ELEMENTS } from '../rules';
import type { ElementEvent, Penalty } from '../types';
import { BALLET_MOVES, balletBand } from './rules';

export class GrandJeteDetector {
  private leap: SplitLeapDetector;
  live = { airborne: false };

  constructor(onEvent: (event: ElementEvent) => void) {
    this.leap = new SplitLeapDetector((leap) => {
      if (leap.code === ELEMENTS.SPLIT_LEAP.code) onEvent(judgeGrandJete(leap));
    });
  }

  reset(): void {
    this.leap.reset();
    this.live = { airborne: false };
  }

  update(frame: DetectorFrame): void {
    this.leap.update(frame);
    this.live = { airborne: this.leap.live.airborne };
  }
}

/** Re-judges a measured split leap as a grand jeté with the ballet rubric. */
export function judgeGrandJete(leap: ElementEvent): ElementEvent {
  const rule = BALLET_MOVES.GRAND_JETE;
  const split = leap.measurements.peakSplitDeg ?? 0;
  const band = balletBand(rule.requiredSplitDeg - split);
  const penalties: Penalty[] = band.penalty > 0
    ? [{
      reason: `Split ${band.measuredDeg}° short of 180° at the top of the jump (${band.deg}° after the 3° camera margin)`,
      value: band.penalty, ref: '#B7 Ballet rubric', segment: 'leapSplit', measuredDeg: band.measuredDeg, band: band.band,
    }]
    : [];
  return {
    ...leap,
    element: rule.name,
    code: rule.code,
    box: undefined,
    dbValid: band.creditsDifficulty,
    dbValue: band.creditsDifficulty ? rule.value : 0,
    penalties,
    measurements: { ...leap.measurements, band: band.band, deviationDeg: band.measuredDeg },
    // The leap detector's camera and visibility warnings still apply.
    warnings: [...leap.warnings, 'Pointed feet, the arms and the landing are not measured: the teacher checks them', 'Rubric values not yet checked by a ballet teacher'],
    requirement: rule.requirement,
    ruleRef: rule.ref,
  };
}
