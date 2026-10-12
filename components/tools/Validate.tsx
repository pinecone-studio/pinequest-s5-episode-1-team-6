'use client';

// Balance validation: checks the app's calls against labeled photos (data/validation/, see
// data/README.md). Photos stay on this computer: nothing is uploaded.

import { useEffect, useState, type ChangeEvent } from 'react';
import { getImageTracker, landmarksFromImage, analyzeLandmarks } from '@/lib/tools/analyzeImage';
import {
  fixturesJson, folderOf, parseLabels, resultsCsv, summarize, validationRow, verdict,
  type Label, type ValidationRow,
} from '@/lib/tools/validation';
import { drawSkeleton } from '@/lib/draw';
import { downloadFile } from '@/lib/ui/download';
import { ghostButton, secondaryButton } from '../ui';
import { ToolPage, useAppPoseLibrary } from './ToolPage';

interface Row extends ValidationRow {
  thumbnail: string; // photo with the skeleton, as a data URL
}

const VERDICT_COLOR = { ok: 'text-good', bad: 'text-bad', muted: 'text-muted' };

export function Validate() {
  useAppPoseLibrary();
  const [status, setStatus] = useState('Loading pose model…');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    getImageTracker().then(() => setStatus('Ready.'));
  }, []);

  async function run(fileList: FileList | null) {
    const files = [...(fileList ?? [])];
    // labels.csv files, keyed by their folder so several folders can be checked at once.
    const labelsByFolder = new Map<string, Map<string, Label>>();
    for (const f of files.filter((f) => f.name.toLowerCase() === 'labels.csv')) {
      labelsByFolder.set(folderOf(f), parseLabels(await f.text()));
    }
    const photos = files.filter((f) => f.type.startsWith('image/'));
    const done: Row[] = [];
    setRows([]);
    for (const [i, file] of photos.entries()) {
      setStatus(`Checking ${i + 1} / ${photos.length}…`);
      const folder = folderOf(file);
      const label = labelsByFolder.get(folder)?.get(file.name) ?? {};
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      const lm = await landmarksFromImage(img);
      const a = lm ? analyzeLandmarks(lm) : null;
      done.push({ ...validationRow(file.name, folder, label, lm, a), thumbnail: thumbnail(img, lm) });
      setRows([...done]);
      URL.revokeObjectURL(img.src);
    }
    setStatus(`Done: ${photos.length} photo${photos.length === 1 ? '' : 's'}.`);
  }

  const pickerProps = (extra: object) => ({
    type: 'file',
    multiple: true,
    hidden: true,
    onChange: (e: ChangeEvent<HTMLInputElement>) => void run(e.target.files),
    ...extra,
  });

  return (
    <ToolPage
      title="Balance validation"
      intro={<>Checks the app&apos;s calls against labeled photos. Pick a folder from <code>data/validation/</code> (or
        select photos plus <code>labels.csv</code>). Photos stay on this computer: nothing is uploaded. See{' '}
        <code>data/README.md</code> for how to label and shoot them.</>}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className={`${secondaryButton} cursor-pointer`}>
          Choose folder
          {/* webkitdirectory is not in React's types; it lets people pick a whole folder */}
          <input {...pickerProps({ webkitdirectory: '' })} />
        </label>
        <label className={`${secondaryButton} cursor-pointer`}>
          Choose photos + labels.csv
          <input {...pickerProps({ accept: 'image/*,.csv' })} />
        </label>
        <button className={ghostButton} disabled={rows.length === 0} onClick={() => downloadFile('validation-results.csv', resultsCsv(rows), 'text/csv')}>
          Export results CSV
        </button>
        <button className={ghostButton} disabled={rows.length === 0} onClick={() => downloadFile('real-balances.json', fixturesJson(rows))}>
          Export keypoints (tests)
        </button>
        <span className="text-sm text-muted">{status}</span>
      </div>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] border-t border-ink">
        {summarize(rows).map((s) => (
          <div key={s.shape} className="grid gap-1.5 border-b border-line py-3.5 pr-3.5">
            <span className="text-[13px] font-semibold text-muted">{s.shape}</span>
            <b className="text-[28px] leading-none font-normal">{s.shapeOk} / {s.n}</b>
            <small className="text-sm text-muted">recognized · same deduction {s.deductionOk} / {s.judged}</small>
          </div>
        ))}
      </section>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {['Photo', 'File', 'Expected', 'App sees', 'Measured', 'Judge −', 'App −', 'Result'].map((h) => (
                <th key={h} className="border-b border-ink px-2.5 py-2 text-left text-[10px] font-normal tracking-[0.18em] text-muted uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className="px-2.5 py-2 text-muted">No photos yet.</td></tr>}
            {rows.map((r, i) => {
              const [word, tone] = verdict(r);
              return (
                <tr key={i} className="[&>td]:border-b [&>td]:border-line [&>td]:px-2.5 [&>td]:py-2 [&>td]:align-middle">
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
                  <td><img src={r.thumbnail} alt="" className="block h-auto w-[120px] bg-card" /></td>
                  <td>{r.file}</td>
                  <td>{r.expected ?? '–'}</td>
                  <td>{r.detected}</td>
                  <td>{r.measured}</td>
                  <td>{r.judgeDeduction == null ? '–' : r.judgeDeduction.toFixed(2)}</td>
                  <td>{r.appDeduction == null ? '–' : r.appDeduction.toFixed(2)}</td>
                  <td className={VERDICT_COLOR[tone]}>{word}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ToolPage>
  );
}

/** Small copy of the photo with the skeleton drawn on it. */
function thumbnail(img: HTMLImageElement, lm: Parameters<typeof drawSkeleton>[1]): string {
  const scale = 240 / Math.max(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const overlay = document.createElement('canvas');
  overlay.width = img.naturalWidth;
  overlay.height = img.naturalHeight;
  drawSkeleton(overlay.getContext('2d')!, lm);
  ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}
