'use client';

// The Saved videos page: videos of the moves that lost points (mistake marked), saved in this browser
// after each routine (lib/recording/clipStore.ts). Newest routine first; delete one or all.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  deleteAllRoutines,
  deleteRoutine,
  KEEP_ROUTINES,
  listRoutines,
  movesOf,
  type SavedMove,
  type SavedRoutine,
} from '@/lib/recording/clipStore';
import { clipFileName, videoExtension } from '@/lib/recording/clipWindows';
import { AccountButton } from './auth/AccountButton';
import { MoveMedia, type MoveMediaFiles } from './MoveMedia';
import { chip, ghostButton, smallText } from './ui';

export function SavedVideos() {
  const [routines, setRoutines] = useState<SavedRoutine[] | null>(null);
  const reload = useCallback(() => {
    void listRoutines().then(setRoutines);
  }, []);
  useEffect(reload, [reload]);

  async function deleteAll() {
    if (!window.confirm('Delete all saved videos from this browser?')) return;
    await deleteAllRoutines();
    reload();
  }

  return (
    <main className="mx-auto grid max-w-[1000px] gap-6 px-[clamp(16px,4vw,40px)] pt-8 pb-12">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[13px] font-semibold text-muted">
            <Link className="text-accent" href="/">Rhymnast</Link> · Saved videos
          </p>
          <AccountButton />
        </div>
        <h1 className="m-0 text-4xl leading-tight font-bold">Saved videos</h1>
        <p className={smallText}>
          {`Videos of the moves that lost points, from the newest ${KEEP_ROUTINES} routines. The part that lost points is marked in red. They are kept in this browser only: nothing is uploaded.`}
        </p>
      </div>

      {routines === null && <p className={smallText} role="status">Loading…</p>}
      {routines?.length === 0 && (
        <p className="m-0 rounded-card bg-card px-5 py-4">
          No saved videos yet. After a routine, press Finish: the moves that lost points are saved here.
        </p>
      )}
      {routines && routines.length > 0 && (
        <>
          <ol className="m-0 grid list-none gap-4 p-0">
            {routines.map((r) => <RoutineCard key={r.id} routine={r} onDeleted={reload} />)}
          </ol>
          <button type="button" className={`${ghostButton} w-fit`} onClick={() => void deleteAll()}>
            Delete all saved videos
          </button>
        </>
      )}
    </main>
  );
}

function RoutineCard({ routine, onDeleted }: { routine: SavedRoutine; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [moves, setMoves] = useState<SavedMove[] | null>(null);
  const when = new Date(routine.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  async function toggle() {
    if (!open && moves === null) setMoves(await movesOf(routine.id));
    setOpen(!open);
  }

  async function remove() {
    if (!window.confirm(`Delete the videos of the routine from ${when}?`)) return;
    await deleteRoutine(routine.id);
    onDeleted();
  }

  return (
    <li className="grid gap-3.5 rounded-card bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <b className="text-lg">{when}</b>
          <p className={smallText}>
            {`Points lost: ${routine.pointsLost.toFixed(2)} · ${routine.videos} video${routine.videos === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={ghostButton} aria-expanded={open} onClick={() => void toggle()}>
            {open ? 'Hide videos' : 'Show videos'}
          </button>
          <button type="button" className={ghostButton} onClick={() => void remove()}>Delete</button>
        </div>
      </div>
      {open && moves && (
        <ol className="m-0 grid list-none gap-3 p-0">
          {moves.map((m) => <SavedMoveItem key={m.id} move={m} createdAt={routine.createdAt} />)}
        </ol>
      )}
    </li>
  );
}

function SavedMoveItem({ move, createdAt }: { move: SavedMove; createdAt: number }) {
  const [files, setFiles] = useState<MoveMediaFiles | null>(null);

  // Browser links to the stored files: made and freed together.
  useEffect(() => {
    const when = new Date(createdAt);
    const next: MoveMediaFiles = {
      clip: move.clip,
      clipUrl: URL.createObjectURL(move.clip),
      clipName: clipFileName(when, move.number, move.name, videoExtension(move.clipType)),
      photoUrl: URL.createObjectURL(move.photo),
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the links must be freed in this effect's cleanup
    setFiles(next);
    return () => {
      URL.revokeObjectURL(next.clipUrl);
      URL.revokeObjectURL(next.photoUrl);
    };
  }, [move, createdAt]);

  return (
    <li className="grid gap-1.5 rounded-xl bg-bg px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-2.5">
        <b className="text-[17px]">{`${move.number}. ${move.name}`}</b>
        <span className={`flex-none rounded-full px-2.5 py-[3px] text-sm font-bold whitespace-nowrap ${chip[move.tone]}`}>{move.result}</span>
      </div>
      {move.reasons.map((reason) => <p key={reason} className="m-0 text-[15px]">{reason}</p>)}
      {files && <MoveMedia files={files} name={move.name} />}
    </li>
  );
}
