'use client';

// The organizer's competition while it runs. One participant at a time:
//   idle        "Next up: 2. Anu" -> Start (asks first) -> the AI camera judges, the judges' phones
//               show the participant and the AI's suggestions
//   performing  Finish performance -> the judges can send their scores
//   scoring     who has sent (live), the result so far, penalties -> Save result -> next participant
// The camera stays on between participants. A video can replace the camera (for a demo).

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  endPerformance, finalizeParticipant, finishCompetition, publishLive, setPenalties, startParticipant,
  watchJudges, watchParticipants, watchScores,
} from '@/lib/firebase/competition';
import { competitionErrorText } from '@/lib/firebase/errors';
import { buildLiveState, LivePublisher } from '@/lib/competition/livePublisher';
import { combineScores, panelScore, ROLE_NAMES, ROLES, type Role } from '@/lib/competition/panel';
import type { Competition, Judge, JudgeScore, Participant, ParticipantStatus } from '@/lib/competition/types';
import type { JudgingSession, SessionState } from '@/lib/session';
import { useJudgingSession } from '../useJudgingSession';
import { Stage } from '../Stage';
import { bigButton, chip, ghostButton, input, primaryButton, smallText } from '../ui';
import { card, CardTitle, CompetitionShell, StatusLine } from './CompetitionShell';
import { ConfirmDialog } from './ConfirmDialog';
import { ParticipantDetail } from './ParticipantDetail';
import { useGiveRoles } from './useGiveRoles';
import { useWatch } from './useWatch';

export const PARTICIPANT_STATUS: Record<ParticipantStatus, { text: string; tone: keyof typeof chip }> = {
  waiting: { text: 'Waiting', tone: 'muted' },
  performing: { text: 'Performing', tone: 'bad' },
  scoring: { text: 'Scoring', tone: 'warn' },
  done: { text: 'Done', tone: 'good' },
};

/** Scores are shown with 3 decimals, as in RG results. */
export const score3 = (value: number) => value.toFixed(3);

export function Running({ competition }: { competition: Competition }) {
  const cid = competition.id;
  const judges = useWatch(useCallback(
    (onChange: (j: Judge[]) => void, onError: (e: Error) => void) => watchJudges(cid, onChange, onError), [cid]));
  const participants = useWatch(useCallback(
    (onChange: (p: Participant[]) => void, onError: (e: Error) => void) => watchParticipants(cid, onChange, onError), [cid]));
  useGiveRoles(cid, judges.value);

  const { session, state } = useJudgingSession();
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => session.setSport('gymnastics'), [session]); // competition mode: rhythmic gymnastics
  useEffect(() => session.attach(videoRef.current!, canvasRef.current!, stageRef.current!), [session]);
  useEffect(() => session.setAnglesVisible(false), [session]);

  const current = competition.current;
  const performing = competition.phase === 'performing' && current !== null;
  const startedAt = usePublishLive(cid, session, performing ? current.pid : null);

  const [asking, setAsking] = useState<Participant | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<void>) => action().catch((err) => setError(competitionErrorText(err)));

  const list = participants.value ?? [];
  const next = list.find((p) => p.status === 'waiting') ?? null;
  const cameraReady = Boolean(state.source) && state.modelReady && !state.busy;

  function start(p: Participant) {
    setAsking(null);
    void run(async () => {
      await startParticipant(cid, p);
      session.startRoutine();
    });
  }

  function finishPerformance() {
    if (!current) return;
    session.finishRoutine();
    void run(() => endPerformance(cid, current.pid));
  }

  const main = performing
    ? { label: 'Finish performance', onClick: finishPerformance }
    : !state.source
      ? { label: 'Turn on camera', onClick: () => session.onMainButton() }
      : { label: next ? `Start ${next.name}` : 'Everyone has performed', onClick: () => next && setAsking(next) };

  return (
    <CompetitionShell
      crumb="Competition"
      title={competition.name}
      wide
      actions={
        <div className="flex flex-wrap gap-2">
          <a
            className={`${ghostButton} no-underline`}
            href={`/compete/board?c=${encodeURIComponent(cid)}`}
            target="_blank"
            rel="noopener"
          >
            Leaderboard ↗
          </a>
          {competition.status !== 'finished' && (
            <button type="button" className={ghostButton} disabled={competition.phase !== 'idle'} onClick={() => setFinishing(true)}>
              Finish competition
            </button>
          )}
        </div>
      }
    >
      {(error || judges.error || participants.error) && (
        <StatusLine error>{error ?? competitionErrorText(judges.error ?? participants.error)}</StatusLine>
      )}
      <div className="grid grid-cols-1 gap-6 min-[960px]:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section className="grid min-w-0 content-start gap-4">
          <Stage
            stageRef={stageRef}
            videoRef={videoRef}
            canvasRef={canvasRef}
            message={state.message}
            busy={state.busy}
            judging={state.judging}
            live={state.live}
            cards={state.cards}
            source={state.source}
            main={main}
          />
          <CameraControls session={session} state={state} performing={performing} />
        </section>

        <aside className="grid min-w-0 content-start gap-4">
          <NowCard
            competition={competition}
            participants={list}
            judges={judges.value ?? []}
            next={next}
            cameraReady={cameraReady}
            aiRunning={state.judging}
            aiFinished={state.finished}
            startedAt={startedAt}
            onAsk={setAsking}
            onFinishPerformance={finishPerformance}
            onRestartAi={() => session.startRoutine()}
            run={run}
          />
          <ParticipantList
            cid={cid}
            judges={judges.value ?? []}
            participants={list}
            canStart={competition.phase === 'idle' && cameraReady}
            onStart={setAsking}
          />
        </aside>
      </div>

      <ConfirmDialog
        open={asking !== null}
        title={asking ? `Start judging ${asking.order}. ${asking.name}?` : ''}
        confirmLabel="Start"
        onConfirm={() => asking && start(asking)}
        onCancel={() => setAsking(null)}
      >
        The AI camera starts judging now, and the judges&apos; phones show <b className="text-ink">{asking?.name}</b>.
        Press Finish performance when the routine ends.
      </ConfirmDialog>
      <ConfirmDialog
        open={finishing}
        title="Finish the competition?"
        confirmLabel="Finish competition"
        onConfirm={() => {
          setFinishing(false);
          void run(() => finishCompetition(cid));
        }}
        onCancel={() => setFinishing(false)}
      >
        The leaderboard shows the final ranking. Participants who haven&apos;t performed stay without a score.
      </ConfirmDialog>
    </CompetitionShell>
  );
}

/**
 * While a participant performs, send the AI's suggestions to the judges (at most every 500 ms).
 * Returns when the performance started (for the timer).
 */
function usePublishLive(cid: string, session: JudgingSession, pid: string | null): number | null {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  useEffect(() => {
    if (!pid) return;
    const since = Date.now();
    // Not a render-time value: the moment this participant started, kept for the timer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStartedAt(since);
    const publisher = new LivePublisher((live) => void publishLive(cid, live).catch(() => undefined));
    const push = () => {
      const s = session.getSnapshot();
      const status = session.scoreboard.compute().status;
      publisher.update(buildLiveState(pid, session.scoreboard.events, status, s.live, since, Date.now()));
    };
    push();
    const unsubscribe = session.subscribe(push);
    return () => {
      unsubscribe();
      push(); // the moves judged when Finish was pressed
      publisher.flush();
      publisher.stop();
    };
  }, [cid, session, pid]);
  return pid ? startedAt : null;
}

/** Camera / video buttons under the video. */
function CameraControls({ session, state, performing }: { session: JudgingSession; state: SessionState; performing: boolean }) {
  const link = 'cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent underline underline-offset-[3px] disabled:cursor-default disabled:opacity-45';
  if (!state.source) {
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <button className={`${primaryButton} ${bigButton} max-sm:w-full`} disabled={state.busy} onClick={() => session.onMainButton()}>
          {state.busy ? 'Please wait…' : 'Turn on camera'}
        </button>
        <VideoPicker className={link} disabled={state.busy} onFile={(f) => void session.loadFile(f, { start: false })}>
          or use a video
        </VideoPicker>
        <p className={`${smallText} basis-full`}>Turn the camera on before the first participant. It stays on between participants.</p>
      </div>
    );
  }
  if (performing) return <p className={smallText}>The AI judges this performance. Its suggestions appear on the judges&apos; phones.</p>;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      {state.source === 'file' ? (
        <>
          <button type="button" className={link} disabled={state.busy} onClick={() => void session.useCamera()}>Use the camera</button>
          <VideoPicker className={link} disabled={state.busy} onFile={(f) => void session.loadFile(f, { start: false })}>Use another video</VideoPicker>
        </>
      ) : (
        <>
          {state.cameraCount > 1 && (
            <button type="button" className={ghostButton} disabled={state.busy} onClick={() => void session.switchCamera()}>Switch camera</button>
          )}
          <VideoPicker className={link} disabled={state.busy} onFile={(f) => void session.loadFile(f, { start: false })}>Use a video instead</VideoPicker>
        </>
      )}
    </div>
  );
}

function VideoPicker({ className, disabled, onFile, children }: { className: string; disabled: boolean; onFile: (f: File) => void; children: ReactNode }) {
  return (
    <label className={className} aria-disabled={disabled || undefined}>
      {children}
      <input
        type="file"
        accept="video/*"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

interface NowCardProps {
  competition: Competition;
  participants: Participant[];
  judges: Judge[];
  next: Participant | null;
  cameraReady: boolean;
  aiRunning: boolean;
  /** The AI's routine ended by itself (the video reached its end). */
  aiFinished: boolean;
  startedAt: number | null;
  onAsk: (p: Participant) => void;
  onFinishPerformance: () => void;
  onRestartAi: () => void;
  run: (action: () => Promise<void>) => void;
}

/** What happens now: who is next, who is performing, or who is being scored. */
function NowCard({ competition: c, participants, judges, next, cameraReady, aiRunning, aiFinished, startedAt, onAsk, onFinishPerformance, onRestartAi, run }: NowCardProps) {
  if (c.phase === 'performing' && c.current) {
    return (
      <section className={`${card} border-l-[6px] border-l-bad`} aria-live="polite">
        <CardTitle aside={startedAt ? <Timer since={startedAt} /> : null}>Now performing</CardTitle>
        <p className="m-0 font-display text-[30px] leading-tight">{`${c.current.order}. ${c.current.name}`}</p>
        {!aiRunning && aiFinished && <p className={smallText}>The video has ended. Press Finish performance.</p>}
        {!aiRunning && !aiFinished && (
          <p className="m-0 text-[15px] text-warn">
            The AI is not judging (the page was reloaded?).{' '}
            <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent underline" onClick={onRestartAi}>Start the AI again</button>
          </p>
        )}
        <button className={`${primaryButton} ${bigButton} w-full`} onClick={onFinishPerformance}>Finish performance</button>
      </section>
    );
  }
  if (c.phase === 'scoring' && c.current) {
    const p = participants.find((x) => x.id === c.current!.pid);
    return p ? <ScoringCard key={p.id} cid={c.id} participant={p} judges={judges} run={run} /> : null;
  }
  if (c.status === 'finished') {
    return <section className={card}><CardTitle>The competition has finished</CardTitle><p className={smallText}>The leaderboard shows the final ranking.</p></section>;
  }
  return (
    <section className={card} aria-live="polite">
      <CardTitle>Next up</CardTitle>
      {next ? (
        <>
          <p className="m-0 font-display text-[30px] leading-tight">{`${next.order}. ${next.name}`}</p>
          <button className={`${primaryButton} ${bigButton} w-full`} disabled={!cameraReady} onClick={() => onAsk(next)}>
            {`Start ${next.name}`}
          </button>
          {!cameraReady && <p className={smallText}>Turn on the camera (or choose a video) first.</p>}
        </>
      ) : (
        <p className="m-0">Everyone has performed. Finish the competition when you are ready.</p>
      )}
    </section>
  );
}

/** mm:ss since the performance started. */
function Timer({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return <span className="font-semibold text-bad tabular-nums" aria-label="Time since the start">{`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`}</span>;
}

/** Scoring one participant: which judges have sent (live), the result so far, penalties, Save. */
function ScoringCard({ cid, participant: p, judges, run }: { cid: string; participant: Participant; judges: Judge[]; run: (a: () => Promise<void>) => void }) {
  const scores = useWatch(useCallback(
    (onChange: (s: JudgeScore[]) => void, onError: (e: Error) => void) => watchScores(cid, p.id, onChange, onError), [cid, p.id]));
  const [penalties, setPenaltiesDraft] = useState(String(p.penalties || 0));
  const sent = scores.value ?? [];
  const byRole = groupByRole(sent);
  const penaltyValue = Math.max(0, Number.parseFloat(penalties) || 0);
  const withRole = judges.filter((j): j is Judge & { role: Role } => j.role !== null);
  const result = combineScores(byRole, penaltyValue, withRole.map((j) => j.role));
  const allSent = withRole.length > 0 && withRole.every((j) => sent.some((s) => s.judgeUid === j.uid));

  return (
    <section className={`${card} border-l-[6px] border-l-warn`} aria-live="polite">
      <CardTitle aside={<span className={`text-sm font-semibold tabular-nums ${allSent ? 'text-good' : 'text-muted'}`}>{`${sent.length} of ${withRole.length} sent`}</span>}>
        Scoring
      </CardTitle>
      <p className="m-0 font-display text-[30px] leading-tight">{`${p.order}. ${p.name}`}</p>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {withRole.map((j) => {
          const s = sent.find((x) => x.judgeUid === j.uid);
          return (
            <li key={j.uid} className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3.5 py-2">
              <span className="min-w-0 truncate"><b className="mr-1.5">{j.role}</b>{j.name}</span>
              {s ? <span className="font-semibold text-good tabular-nums">{`✓ ${score3(s.value)}`}</span> : <span className="text-muted">Waiting…</span>}
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-4 gap-2 text-center">
        {ROLES.map((r) => <Part key={r} label={ROLE_NAMES[r]} value={byRole[r].length ? score3(panelScore(byRole[r]).score ?? 0) : '–'} />)}
        <Part label="Final" value={result ? score3(result.final) : '–'} accent />
      </div>
      <label className="grid gap-1 text-sm font-semibold">
        Penalties (time, line, music…)
        <input
          className={input}
          type="number"
          min={0}
          step={0.05}
          inputMode="decimal"
          value={penalties}
          onChange={(e) => setPenaltiesDraft(e.target.value)}
          onBlur={() => void setPenalties(cid, p.id, penaltyValue)}
        />
      </label>
      <button
        className={`${primaryButton} ${bigButton} w-full`}
        disabled={!result}
        onClick={() => result && run(() => finalizeParticipant(cid, p.id, result))}
      >
        {allSent ? 'Save result' : 'Save result now'}
      </button>
      <p className={smallText}>
        {!result
          ? 'Every role with a judge needs at least one score before the result can be saved.'
          : allSent ? 'All judges have sent their scores.' : 'Not every judge has sent yet. Wait, or save with the scores you have.'}
      </p>
    </section>
  );
}

function Part({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="grid gap-0.5 rounded-[10px] bg-bg px-1.5 py-2">
      <span className="truncate text-xs text-muted">{label}</span>
      <b className={`text-[17px] tabular-nums ${accent ? 'text-accent' : ''}`}>{value}</b>
    </div>
  );
}

function groupByRole(scores: JudgeScore[]): Record<Role, number[]> {
  const out: Record<Role, number[]> = { D: [], A: [], E: [] };
  for (const s of scores) out[s.role]?.push(s.value);
  return out;
}

interface ListProps {
  cid: string;
  judges: Judge[];
  participants: Participant[];
  canStart: boolean;
  onStart: (p: Participant) => void;
}

/** Everyone in starting order, with their status. A finished one opens its breakdown. */
function ParticipantList({ cid, judges, participants, canStart, onStart }: ListProps) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className={card} aria-labelledby="running-participants">
      <CardTitle><span id="running-participants">Participants</span></CardTitle>
      <ol className="m-0 grid list-none gap-2 p-0">
        {participants.map((p) => {
          const st = PARTICIPANT_STATUS[p.status];
          return (
            <li key={p.id} className="grid gap-2 rounded-xl bg-bg px-3.5 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 flex-none text-right font-bold text-muted tabular-nums">{p.order}.</span>
                <b className="min-w-0 flex-1 truncate">{p.name}</b>
                {p.status === 'done' && p.result ? (
                  <button
                    type="button"
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-2 py-1 font-bold text-accent tabular-nums hover:bg-accent-soft"
                    aria-expanded={open === p.id}
                    aria-label={`${score3(p.result.final)}: show the breakdown for ${p.name}`}
                    onClick={() => setOpen(open === p.id ? null : p.id)}
                  >
                    {score3(p.result.final)}
                    <span aria-hidden="true" className={`text-xs transition-transform duration-150 motion-reduce:transition-none ${open === p.id ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                ) : p.status === 'waiting' ? (
                  <button type="button" className={`${ghostButton} min-h-9 px-3.5 text-sm`} disabled={!canStart} onClick={() => onStart(p)}>
                    Start
                  </button>
                ) : (
                  <span className={`rounded-full px-2.5 py-[3px] text-sm font-bold ${chip[st.tone]}`}>{st.text}</span>
                )}
              </div>
              {open === p.id && <ParticipantDetail cid={cid} participant={p} judges={judges} />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
