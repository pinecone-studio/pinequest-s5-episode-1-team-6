'use client';

// "Teach poses": show the app correct examples of each pose.
//   Record 3 s: a 3-2-1 countdown, then every camera frame for 3 seconds becomes an example
//               (the recording itself runs in the session, frame by frame).
//   Add photos: each photo becomes one example.
// The examples go into the pose library (lib/ui/libraryStore.ts), which the app uses at once.

import { useState } from 'react';
import type { JudgingSession } from '@/lib/session';
import { balanceFrame, legsUsable } from '@/lib/elements/balanceFrame';
import { poseSignature } from '@/lib/library/signature';
import { POSES, POSE_NAMES, type PoseLabel } from '@/lib/library/recognizer';
import { exportTaught, importTaught, libraryCounts, resetTaught, teach } from '@/lib/ui/libraryStore';
import { landmarksFromImage } from '@/lib/tools/analyzeImage';
import { downloadFile } from '@/lib/ui/download';
import { ghostButton, input, secondaryButton, smallText } from './ui';

interface TeachPanelProps {
  session: JudgingSession;
  recording: boolean;
  status: string;
}

export function TeachPanel({ session, recording, status }: TeachPanelProps) {
  const [pose, setPose] = useState<PoseLabel>(POSES[0]);
  // Taught counts come from browser storage: Settings is only rendered in the browser, once opened.
  const { default: base, taught } = libraryCounts();

  async function addPhotos(files: File[]) {
    const signatures: number[][] = [];
    for (const [i, file] of files.entries()) {
      session.setTeachStatus(`Reading photo ${i + 1} of ${files.length}…`);
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();
      const lm = await landmarksFromImage(img);
      URL.revokeObjectURL(img.src);
      const f = lm && legsUsable(lm).ok ? balanceFrame(lm) : null;
      if (f) signatures.push(poseSignature(f));
    }
    if (signatures.length) teach(pose, signatures, 'taught-photo');
    session.libraryChanged(`Added ${signatures.length} of ${files.length} photos as ${POSE_NAMES[pose]}`
      + (signatures.length < files.length ? ' (the rest had no clearly visible gymnast).' : '.'));
  }

  async function importFile(file: File) {
    try {
      const n = importTaught(await file.text());
      session.libraryChanged(`Imported ${n} examples.`);
    } catch (err) {
      session.setTeachStatus(`Could not import: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const fileButton = `${secondaryButton} cursor-pointer`;
  return (
    <details>
      <summary><b>Teach poses</b></summary>
      <div className="mt-2 grid gap-2">
        <p className={smallText}>
          Show the app correct examples so it recognizes your gymnasts better. Pick the pose, press
          Record, and hold the correct pose sideways for 3 seconds.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${input} w-auto flex-[1_1_180px]`} aria-label="Pose to teach" value={pose} onChange={(e) => setPose(e.target.value as PoseLabel)}>
            {POSES.map((p) => <option key={p} value={p}>{POSE_NAMES[p]}</option>)}
          </select>
          <button className={secondaryButton} disabled={recording} onClick={() => session.startTeachRecording(pose)}>Record 3 s</button>
          <label className={fileButton}>
            Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = '';
                if (files.length) void addPhotos(files);
              }}
            />
          </label>
        </div>
        <ul className="m-0 grid list-none gap-1 p-0 text-sm">
          {POSES.map((p) => (
            <li key={p} className="flex justify-between gap-2">
              <span>{POSE_NAMES[p]}</span>
              <b>{base[p] + taught[p]}</b>
              {taught[p] > 0 && <small className="text-accent">{taught[p]} taught</small>}
            </li>
          ))}
        </ul>
        <p className={smallText}>{status}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button className={ghostButton} onClick={() => downloadFile('rhymnast-poses.json', exportTaught())}>Save taught poses</button>
          <label className={`${ghostButton} cursor-pointer`}>
            Load taught poses
            <input
              type="file"
              accept="application/json,.json"
              hidden
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
              resetTaught();
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
