// End-of-routine deduction report: every judged move in order, each deduction with the rulebook
// sentence behind it, and the totals. Pure data (no HTML), so it can be tested and exported.

import { RULE_SOURCE, round2, ruleTextFor, type RuleText } from './rules';
import { CHEER_NOT_JUDGED, CHEER_RULE_SOURCE, cheerRuleTextFor } from './cheer/rules';
import { BALLET_NOT_JUDGED, BALLET_RULE_SOURCE, balletRuleTextFor } from './ballet/rules';
import type { Sport } from './sport';
import type { DbStatus, JudgeInputs, Scoreboard } from './scoring';
import type { Measurements, Penalty } from './types';

const STATUS_TEXT: Record<DbStatus, string> = {
  counted: 'Counted in D',
  repeat: 'Not counted: same difficulty already performed (#2.4.1)',
  'not valid': 'Not valid as a difficulty',
  'not in top 8': 'Not counted: only the highest 8 difficulties count (#1.5)',
  rejected: 'Rejected by the judge',
  'technique only': 'Judged on technique only (no difficulty value)',
};

/** Same, for the sports with a team-made rubric (cheer, ballet): no Code of Points sections. */
const RUBRIC_STATUS_TEXT: Record<DbStatus, string> = {
  ...STATUS_TEXT,
  repeat: 'Not counted again: same move already performed',
  'not valid': 'No difficulty: too far from the move\'s shape',
  'not in top 8': 'Not counted: only the highest 8 difficulties count',
};

const GYMNASTICS_NOT_JUDGED = [
  'Apparatus difficulties (DA), dance steps and R elements: entered by the judges as extra D.',
  'Apparatus handling faults, artistry and expression: entered by the judges.',
  'The angles in the Code are a guideline for judges (p. 26): every call above can be rejected.',
];

/** Where each sport's rules come from, how their text is looked up, and what the app doesn't judge. */
const SPORT_RULES: Record<Sport, {
  source: string;
  ruleFor: (ref: string) => RuleText | null;
  statusText: Record<DbStatus, string>;
  notJudged: string[];
}> = {
  gymnastics: { source: RULE_SOURCE, ruleFor: ruleTextFor, statusText: STATUS_TEXT, notJudged: GYMNASTICS_NOT_JUDGED },
  cheer: { source: CHEER_RULE_SOURCE, ruleFor: cheerRuleTextFor, statusText: RUBRIC_STATUS_TEXT, notJudged: CHEER_NOT_JUDGED },
  ballet: { source: BALLET_RULE_SOURCE, ruleFor: balletRuleTextFor, statusText: RUBRIC_STATUS_TEXT, notJudged: BALLET_NOT_JUDGED },
};

export interface ReportDeduction extends Penalty {
  rule: RuleText | null;
}

export interface ReportMove {
  id: number; // scoreboard event id (links the move to its video)
  number: number;
  timeMs: number;
  element: string;
  code: string;
  requirement: string | null;
  dbValue: number;
  status: DbStatus | undefined;
  statusText: string;
  measurements: Measurements;
  deductions: ReportDeduction[];
  totalDeduction: number;
  clean: boolean;
  rejected: boolean;
  reviewed: boolean;
  notes: { text: string; rule: RuleText | null }[];
  flatFoot: boolean;
  lowConfidence: boolean;
}

export interface Report {
  sport: Sport;
  ruleSource: string;
  generatedAt: string;
  durationMs: number | null;
  summary: {
    moves: number;
    cleanMoves: number;
    movesWithDeductions: number;
    notReviewed: number; // moves no judge has agreed or disagreed with yet
    totalDeduction: number;
    judgeDeduction: number;
    penalties: number;
    D: number;
    E: number;
    A: number;
    final: number;
  };
  moves: ReportMove[];
  notJudged: string[];
}

export function buildReport(
  scoreboard: Scoreboard,
  judge: JudgeInputs = {},
  { durationMs = null, sport = 'gymnastics' }: { durationMs?: number | null; sport?: Sport } = {},
): Report {
  const scores = scoreboard.compute(judge);
  const rules = SPORT_RULES[sport];
  const events = [...scoreboard.events].sort((a, b) => a.t - b.t);

  const moves = events.map((e, i): ReportMove => {
    const status = scores.status.get(e.id);
    const deductions = e.rejected ? [] : e.penalties.map((p) => ({ ...p, rule: rules.ruleFor(p.ref) }));
    return {
      id: e.id,
      number: i + 1,
      timeMs: e.routineMs ?? e.t,
      element: e.element,
      code: e.code,
      requirement: e.requirement ?? null,
      dbValue: e.dbValue,
      status,
      statusText: status ? rules.statusText[status] : '',
      measurements: e.measurements,
      deductions,
      totalDeduction: round2(deductions.reduce((sum, d) => sum + d.value, 0)),
      clean: !e.rejected && deductions.length === 0,
      rejected: e.rejected,
      reviewed: e.reviewed,
      notes: e.warnings.map((w) => ({ text: w, rule: rules.ruleFor(w) })),
      flatFoot: Boolean(e.flatFoot),
      lowConfidence: Boolean(e.lowConfidence),
    };
  });

  const judged = moves.filter((m) => !m.rejected);
  return {
    sport,
    ruleSource: rules.source,
    generatedAt: new Date().toISOString(),
    durationMs,
    summary: {
      moves: moves.length,
      cleanMoves: judged.filter((m) => m.clean).length,
      movesWithDeductions: judged.filter((m) => !m.clean).length,
      notReviewed: moves.filter((m) => !m.reviewed).length,
      totalDeduction: scores.breakdown.autoE, // automated execution deductions
      judgeDeduction: scores.breakdown.extraE,
      penalties: scores.breakdown.penalties,
      D: scores.D,
      E: scores.E,
      A: scores.A,
      final: scores.final,
    },
    moves,
    notJudged: rules.notJudged,
  };
}
