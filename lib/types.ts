// Shapes of the data that flows between the detectors, the scoreboard and the report.

export type Band = 'none' | 'small' | 'medium' | 'large';

/** One execution deduction on a judged move. */
export interface Penalty {
  reason: string;
  value: number;
  ref: string; // Code of Points reference, e.g. '#2.5.3 p.25'
  segment: string; // which body part / rule: 'split', 'thigh', 'hold', ...
  measuredDeg?: number;
  band?: Band;
  holdMs?: number;
}

/** Measured numbers of a judged move, for the report (all optional: each element fills its own). */
export interface Measurements {
  holdMs?: number;
  peakSplitDeg?: number;
  thighDeg?: number;
  deviationDeg?: number;
  band?: Band;
  flightMs?: number;
  rotationDeg?: number;
  rotations?: number;
  relevePct?: number | null;
  splitDevDeg?: number;
  footDevDeg?: number;
  thighDevDeg?: number;
  trunkDevDeg?: number;
  trunkAboveDevDeg?: number;
}

/** A judged move, as a detector reports it. */
export interface ElementEvent {
  element: string;
  code: string;
  box?: string; // table row: a difficulty from the same box counts once (#2.4.1)
  t: number; // ms
  tStart: number;
  tEnd: number;
  dbValid: boolean;
  dbValue: number;
  penalties: Penalty[];
  measurements: Measurements;
  confidence: number;
  warnings: string[];
  requirement?: string;
  flatFoot?: boolean;
  lowConfidence?: boolean;
  recognizedBy?: string;
  ruleRef: string;
  routineMs?: number; // time since the routine started (set by the app)
}

/** An event stored in the scoreboard. */
export interface StoredEvent extends ElementEvent {
  id: number;
  rejected: boolean;
}
