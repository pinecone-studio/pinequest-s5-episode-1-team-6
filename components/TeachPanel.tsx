'use client';

// "Teach poses": show the app correct examples of each pose.
//   Record 3 s: a 3-2-1 countdown, then every camera frame for 3 seconds becomes an example
//               (the recording itself runs in the session, frame by frame).
//   Add photos: each photo becomes one example.
// The examples go into the sport's pose library (the teach kit, lib/ui/teachKits.ts: gymnastics
// balances or ballet poses), which the app uses at once.

import { useState } from 'react';
import type { JudgingSession } from '@/lib/session';
import type { TeachKit } from '@/lib/ui/teachKits';
import { landmarksFromImage } from '@/lib/tools/analyzeImage';
import { downloadFile } from '@/lib/ui/download';
import { ghostButton, input, secondaryButton, smallText } from './ui';

interface TeachPanelProps {
  kit: TeachKit;
  session: JudgingSession;
  recording: boolean;
  status: string;
}

export function TeachPanel({ kit, session, recording, status }: TeachPanelProps) {
  const { labels, names, store } = kit;
  const [chosen, setPose] = useState<string>(labels[0]);
  const pose = labels.includes(chosen) ? chosen : labels[0]; // the sport (and its labels) may have changed
  // Taught counts come from browser storage: Settings is only rendered in the browser, once opened.
  const { default: base, taught } = store.libraryCounts();

  async function addPhotos(files: File[]) {
    const signatures: number[][] = [];
    for (const [i, file] of files.entries()) {
      session.setTeachStatus(`Reading photo ${i + 1} of ${files.length}…`);
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      const lm = await landmarksFromImage(img);
      URL.revokeObjectURL(img.src);
      const signature = lm ? kit.signatureOf(lm) : null;
      if (signature) signatures.push(signature);
    }
    if (signatures.length) store.teach(pose, signatures, 'taught-photo');
    session.libraryChanged(`Added ${signatures.length} of ${files.length} photos as ${names[pose]}`
      + (signatures.length < files.length ? ' (the rest had no clearly visible person).' : '.'));
  }

  async function importFile(file: File) {
    try {
      const { added, skipped } = store.importTaught(await file.text());
      session.libraryChanged(`Imported ${added} examples.${skipped ? ` ${skipped} were already here and were skipped.` : ''}`);
    } catch (err) {
      session.setTeachStatus(`Could not import: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const fileButton = `${secondaryButton} cursor-pointer`;
  return (
    <details>
      <summary><b>Teach poses</b></summary>
      <div className="mt-2 grid gap-2">
        <p className={smallText}>{kit.howTo}</p>
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${input} w-auto flex-[1_1_180px]`} aria-label="Pose to teach" value={pose} onChange={(e) => setPose(e.target.value)}>
            {labels.map((p) => <option key={p} value={p}>{names[p]}</option>)}
          </select>
          <button className={secondaryButton} disabled={recording} onClick={() => session.startTeachRecording(pose)}>Record 3 s</button>
          <label className={fileButton}>
            Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = '';
                if (files.length) void addPhotos(files);
              }}
            />
          </label>
        </div>
        <ul className="m-0 grid list-none gap-1 p-0 text-sm">
          {labels.map((p) => (
            <li key={p} className="flex justify-between gap-2">
              <span>{names[p]}</span>
              <b>{base[p] + taught[p]}</b>
              {taught[p] > 0 && <small className="text-accent">{taught[p]} taught</small>}
            </li>
          ))}
        </ul>
        <p className={smallText}>{status}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button className={ghostButton} onClick={() => downloadFile(kit.fileName, store.exportTaught())}>Save taught poses</button>
          <label className={`${ghostButton} cursor-pointer`}>
            Load taught poses
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void importFile(file);
              }}
            />
          </label>
          <button
            className={ghostButton}
            onClick={() => {
              store.resetTaught();
              session.libraryChanged('Removed all taught examples. The default library is still used.');
            }}
          >
            Remove taught poses
          </button>
        </div>
      </div>
    </details>
  );
}
