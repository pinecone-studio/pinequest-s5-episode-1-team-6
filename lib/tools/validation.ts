// Balance validation (/tools/validate): checks the app's calls against labeled photos.
// Everything here is plain data, so the page only reads files and draws the table.

import type { Landmarks } from '../geometry';
import type { ImageAnalysis } from './analyzeImage';

/** Folder names in data/validation/ and the shape each one expects (see data/README.md). */
export const FOLDER_SHAPES: Record<string, string> = {
  front_split_help: 'front_split_help',
  front_split: 'front_split',
  back_split: 'back_split',
  attitude: 'attitude',
  not_these: 'none',
};

export interface Label {
  expected: string | null;
  judgeDeduction: number | null;
  notes: string;
}

/** labels.csv -> Map(fileName -> label). Notes may contain commas. */
export function parseLabels(text: string): Map<string, Label> {
  const labels = new Map<string, Label>();
  for (const line of text.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const [file, expected, deduction, ...notes] = line.split(',');
    labels.set(file.trim(), {
      expected: expected?.trim() || null,
      judgeDeduction: deduction?.trim() === '' || deduction == null ? null : Number(deduction),
      notes: notes.join(',').trim(),
    });
  }
  return labels;
}

/** Folder of a picked file ('' when picked on its own). */
export function folderOf(file: File): string {
  const path = file.webkitRelativePath || file.name;
  return path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
}

export interface ValidationRow {
  file: string;
  folder: string;
  expected: string | null;
  judgeDeduction: number | null;
  notes: string;
  found: boolean;
  lm: Landmarks | null;
  detected: string;
  appDeduction: number | null;
  measured: string;
  shapeOk: boolean | null;
  deductionOk: boolean | null;
}

/** Compares one photo's analysis with its label. */
export function validationRow(
  file: string, folder: string, label: Partial<Label>, lm: Landmarks | null, a: ImageAnalysis | null,
): ValidationRow {
  const expected = label.expected ?? FOLDER_SHAPES[folder.split('/').pop() ?? ''] ?? null;
  const detected = a ? a.shape : 'none';
  const appDeduction = a ? a.deduction : null;
  const judgeDeduction = label.judgeDeduction ?? null;
  const shapeOk = expected ? detected === expected : null;
  return {
    file,
    folder,
    expected,
    judgeDeduction,
    notes: label.notes ?? '',
    found: Boolean(lm),
    lm,
    detected,
    appDeduction,
    measured: a ? describe(a) : 'no person found',
    shapeOk,
    deductionOk: shapeOk && judgeDeduction != null && appDeduction != null
      ? Math.abs(judgeDeduction - appDeduction) < 0.001
      : null,
  };
}

/** Short text of what was measured. */
function describe(a: ImageAnalysis): string {
  if (!a.legsVisible) return `legs not visible (${a.visibility.toFixed(2)})`;
  const b = a.balance;
  if (!b.shape) return `no balance · split ${Math.round(a.split)}°`;
  const parts = b.deviations.map((d) => `${d.label} ${Math.round(d.deg)}°`);
  if (b.help) parts.push('help');
  if (b.releve === false) parts.push('flat foot');
  return parts.join(' · ');
}

/** One-word verdict and its tone for the table. */
export function verdict(r: ValidationRow): [string, 'ok' | 'bad' | 'muted'] {
  if (r.shapeOk === null) return ['no label', 'muted'];
  if (!r.shapeOk) return ['wrong shape', 'bad'];
  if (r.deductionOk === false) return ['wrong deduction', 'bad'];
  return r.deductionOk ? ['match', 'ok'] : ['shape ok', 'ok'];
}

export interface ShapeSummary {
  shape: string;
  n: number;
  shapeOk: number;
  judged: number;
  deductionOk: number;
}

/** Per expected shape: how many were recognized, and how many got the judge's deduction. */
export function summarize(rows: ValidationRow[]): ShapeSummary[] {
  const byShape = new Map<string, ShapeSummary>();
  for (const r of rows) {
    if (!r.expected) continue;
    const s = byShape.get(r.expected) ?? { shape: r.expected, n: 0, shapeOk: 0, judged: 0, deductionOk: 0 };
    s.n += 1;
    if (r.shapeOk) s.shapeOk += 1;
    if (r.deductionOk !== null) {
      s.judged += 1;
      if (r.deductionOk) s.deductionOk += 1;
    }
    byShape.set(r.expected, s);
  }
  return [...byShape.values()];
}

/** Results as CSV, for docs/validation.md or a spreadsheet. */
export function resultsCsv(rows: ValidationRow[]): string {
  return [
    'file,folder,expected,detected,measured,judge_deduction,app_deduction,shape_ok,deduction_ok,notes',
    ...rows.map((r) => [r.file, r.folder, r.expected ?? '', r.detected, r.measured,
      r.judgeDeduction ?? '', r.appDeduction ?? '', r.shapeOk ?? '', r.deductionOk ?? '', r.notes]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')),
  ].join('\n');
}

export interface Fixture {
  id: string;
  expected: string;
  judgeDeduction: number | null;
  lm: [number, number, number][];
}

/**
 * Landmarks only (no images, anonymous ids) in the format of lib/library/examples/real-balances.json.
 * Only labeled photos where a person was found are exported.
 */
export function fixturesJson(rows: ValidationRow[]): string {
  const counts: Record<string, number> = {};
  const items: Fixture[] = rows.filter((r) => r.found && r.expected).map((r) => {
    const expected = r.expected!;
    counts[expected] = (counts[expected] ?? 0) + 1;
    return {
      id: `${expected}-${String(counts[expected]).padStart(2, '0')}`,
      expected,
      judgeDeduction: r.judgeDeduction,
      lm: r.lm!.map((p) => [round(p.x, 1), round(p.y, 1), round(p.visibility ?? 0, 2)]),
    };
  });
  return `${JSON.stringify(items)}\n`;
}

function round(x: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}
