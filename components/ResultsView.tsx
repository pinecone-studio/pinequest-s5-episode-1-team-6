// Results after "Finish", built from report data (lib/report.ts).
//   Practice: "You did 3 balances. Points lost: 0.40" + each move with reason and tip.
//   Judge:    the score (difficulty, execution, artistry, final) + each move.
//   Moves that lost points get a photo, a video and downloads (made by the session after Finish).
//   "Show rulebook details" adds codes, measurements, the rule text and pages.

import Link from 'next/link';
import type { Report } from '@/lib/report';
import type { MoveVideo } from '@/lib/session';
import { describeMove } from '@/lib/ui/plain';
import { describeMeasurements, formatTime } from '@/lib/ui/format';
import type { Tab } from './Header';
import { MoveMedia, MoveMediaStatus } from './MoveMedia';
import { chip, ghostButton, smallText, toneBorder } from './ui';

interface ResultsProps {
  report: Report;
  videos: Record<number, MoveVideo>; // by move id: moves that lost points
  videosSaved: boolean | null;
  mode: Tab;
  details: boolean;
  onDetails: () => void;
  onClose: () => void;
}

const headline = 'm-0 rounded-card bg-accent-soft px-[22px] py-5 text-xl font-semibold';
const headlineSmall = 'mt-1 block text-[15px] font-normal text-muted';
const detailsLine = 'm-0 text-[13px] text-muted';

export function ResultsView({ report, videos, videosSaved, mode, details, onDetails, onClose }: ResultsProps) {
  return (
    <section className="mx-auto mb-10 grid max-w-[1000px] gap-[18px] px-[clamp(16px,4vw,40px)] py-6 print:p-0" aria-labelledby="report-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="report-title" className="m-0 text-[26px] leading-tight font-bold">{mode === 'judge' ? 'Score report' : 'Your results'}</h2>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button className={ghostButton} aria-pressed={details} onClick={onDetails}>
            {details ? 'Hide rulebook details' : 'Show rulebook details'}
          </button>
          <button className={ghostButton} onClick={() => window.print()}>Print</button>
          <button className={ghostButton} onClick={onClose}>Close</button>
        </div>
      </div>
      <ReportBody report={report} videos={videos} mode={mode} details={details} />
      <SavedNote saved={videosSaved} />
    </section>
  );
}

/** Where the move videos are kept. */
function SavedNote({ saved }: { saved: boolean | null }) {
  if (saved === null) return null;
  return (
    <p className={`${smallText} print:hidden`}>
      {saved ? (
        <>
          The videos are kept in this browser (newest 10 routines):{' '}
          <Link className="font-semibold text-accent" href="/saved">Saved videos</Link>.
        </>
      ) : (
        'This browser could not keep the videos. Use Download to keep the ones you need.'
      )}
    </p>
  );
}

function ReportBody({ report, videos, mode, details }: { report: Report; videos: Record<number, MoveVideo>; mode: Tab; details: boolean }) {
  const s = report.summary;
  const judged = report.moves.filter((m) => !m.rejected);

  if (report.moves.length === 0) {
    return (
      <p className={headline}>
        No balance was recognized.
        <small className={headlineSmall}>
          Stand sideways to the camera with your whole body and both feet in the picture, and hold each balance for at least 1 second.
        </small>
      </p>
    );
  }

  return (
    <>
      <p className={headline}>
        {`You did ${judged.length} balance${judged.length === 1 ? '' : 's'}. `}
        {s.totalDeduction === 0 ? 'No points lost. Well done!' : `Points lost: ${s.totalDeduction.toFixed(2)}.`}
        <small className={headlineSmall}>
          {`${s.cleanMoves} without mistakes`}{report.durationMs ? ` · ${formatTime(report.durationMs)} long` : ''}
        </small>
      </p>

      {mode === 'judge' && (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {([['Difficulty', s.D], ['Execution', s.E], ['Artistry', s.A], ['Final score', s.final]] as const).map(([label, value], i) => (
              <div key={label} className="grid gap-0.5 rounded-xl bg-card p-3.5">
                <span className="text-sm text-muted">{label}</span>
                <b className={`text-[26px] tabular-nums ${i === 3 ? 'text-accent' : ''}`}>{value.toFixed(2)}</b>
              </div>
            ))}
          </div>
          {s.notReviewed > 0 && (
            <p className="m-0 text-[15px] font-semibold text-warn">
              {`${s.notReviewed} move${s.notReviewed === 1 ? '' : 's'} not checked by a judge yet. Press Agree or Disagree on each move in the Judge tab.`}
            </p>
          )}
          {(s.penalties > 0 || s.judgeDeduction > 0) && (
            <p className={smallText}>
              Includes judge entries: penalties −{s.penalties.toFixed(2)}, extra execution −{s.judgeDeduction.toFixed(2)}.
            </p>
          )}
        </>
      )}

      <ol className="m-0 grid list-none gap-3 p-0">
        {report.moves.map((m) => {
          const d = describeMove(m, m.status);
          return (
            <li key={m.number} className={`grid gap-1.5 rounded-xl border-l-[6px] bg-bg px-4 py-3.5 ${m.rejected ? 'border-l-warn opacity-50' : toneBorder[d.tone]}`}>
              <div className="flex items-baseline justify-between gap-2.5">
                <b className="text-[17px]">{`${m.number}. ${d.name}`}</b>
                <span className={`flex-none rounded-full px-2.5 py-[3px] text-sm font-bold whitespace-nowrap ${chip[m.rejected ? 'muted' : d.tone]}`}>
                  {m.rejected ? 'Judge disagreed' : d.result}
                </span>
              </div>
              {d.reasons.map((r, i) => (
                <p key={i} className="m-0 text-[15px]">
                  {`${r.text} (−${r.value.toFixed(2)})`}
                  {r.tip && <span className="block text-sm text-muted">{r.tip}</span>}
                </p>
              ))}
              {d.reasons.length === 0 && !m.rejected && <p className="m-0 text-[15px]">Correct shape, held for 1 second.</p>}
              {d.notes.map((n) => <p key={n} className="m-0 text-sm text-warn">{n}</p>)}
              <MoveVideoPart video={videos[m.id]} name={d.name} />

              {details && (
                <>
                  <p className={detailsLine}>{`${formatTime(m.timeMs)} · code ${m.code} · difficulty value ${m.dbValue.toFixed(2)} · ${m.statusText}`}</p>
                  <p className={detailsLine}>{`Measured: ${describeMeasurements(m.measurements)}`}</p>
                  {m.requirement && <p className={detailsLine}>{`Rulebook requirement: ${m.requirement}`}</p>}
                  {m.deductions.map((ded, i) => ded.rule && (
                    <blockquote key={i} className="mt-1 mb-0 border-l-[3px] border-line px-3 py-2 text-sm text-muted italic">
                      {`“${ded.rule.text}” Code of Points ${ded.ref.split(' ')[0]}, p. ${ded.rule.page}.`}
                    </blockquote>
                  ))}
                </>
              )}
            </li>
          );
        })}
      </ol>

      {details && (
        <ul className="m-0 pl-[18px] text-[13px] text-muted">
          {report.notJudged.map((line) => <li key={line}>{line}</li>)}
          <li>The first 3° of every measured angle are not deducted: one camera can&apos;t measure more precisely.</li>
          <li>{`Rules: ${report.ruleSource}.`}</li>
        </ul>
      )}
    </>
  );
}

function MoveVideoPart({ video, name }: { video: MoveVideo | undefined; name: string }) {
  if (!video) return null;
  if (video.status === 'ready') return <MoveMedia files={video} name={name} />;
  return <MoveMediaStatus status={video.status} />;
}
