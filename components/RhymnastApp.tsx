'use client';

// The whole judging page. The session (lib/session.ts) runs the camera, pose model and judging;
// this component lays out the page and passes clicks to it.
// The sport comes from the Sports menu in the navbar (rhythmic gymnastics until one is picked);
// the session then judges that sport's moves.
// Two tabs (ModeSwitch, on top of the right column; on phones above the camera) show the same
// judging for two audiences:
//   Practice (gymnast / coach): moves, points lost, one tip each
//   Judge: final score, artistry entry, agree / disagree with each call, full report

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { buildReport } from '@/lib/report';
import { SPORT_TEXT } from '@/lib/sport';
import { useJudgingSession } from './useJudgingSession';
import { Header } from './Header';
import { ModeSwitch, type Tab } from './ModeSwitch';
import { Stage } from './Stage';
import { Controls, mainButtonLabel } from './Controls';
import { JudgePanel, PracticePanel, type JudgeForm } from './SidePanels';
import { ResultsView } from './ResultsView';
import { SettingsDrawer } from './SettingsDrawer';
import { useSport } from './useSport';

const TAB_KEY = 'rhymnast.tab';

export function RhymnastApp() {
  const sport = useSport();
  const { session, state } = useJudgingSession();
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [tab, setTabState] = useState<Tab>('practice');
  const [details, setDetails] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [judgeForm, setJudgeForm] = useState<JudgeForm>({ artistry: '0', extraD: '0', extraE: '0', penalties: '0' });

  // Judge the picked sport (a new sport starts a new routine).
  useEffect(() => session.setSport(sport), [session, sport]);

  // Connect the session to the video once the page is in the browser.
  useEffect(() => session.attach(videoRef.current!, canvasRef.current!, stageRef.current!), [session]);

  // Practice shows the leg angles on the video; the Judge view stays clean.
  useEffect(() => session.setAnglesVisible(tab === 'practice'), [session, tab]);

  // Remember the last tab (per browser). Read after the first render to match the server HTML.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage only exists after hydration
      if (localStorage.getItem(TAB_KEY) === 'judge') setTabState('judge');
    } catch { /* storage blocked: fine */ }
  }, []);
  const setTab = (next: Tab) => {
    setTabState(next);
    try { localStorage.setItem(TAB_KEY, next); } catch { /* storage blocked: fine */ }
  };

  // Scroll to the results each time they are opened by Finish or "Open full report".
  useEffect(() => {
    if (state.resultsRequest > 0) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [state.resultsRequest]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const events = session.scoreboard.events;
  const scores = session.scoreboard.compute(judgeForm);
  const report = state.resultsOpen
    ? buildReport(session.scoreboard, judgeForm, { durationMs: state.resultsDurationMs, sport: state.sport })
    : null;
  const text = SPORT_TEXT[state.sport];

  // A full-height column, so the footer stays at the bottom of the screen when the page is short.
  return (
    <div className="flex min-h-dvh flex-col">
      <Header sport={sport} judging={state.judging} onSettings={() => setSettingsOpen(true)} />

      {/* Wide screens: camera on the left (both rows), the switch above the cards on the right.
          Narrow screens: the switch first, sticky at the top, so it stays in reach above the camera. */}
      <main className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 content-start gap-x-6 gap-y-4 px-[clamp(16px,4vw,40px)] pt-6 pb-8 min-[960px]:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] min-[960px]:grid-rows-[auto_1fr] print:hidden">
        <div className="sticky top-0 z-10 -my-2 bg-bg py-2 short:static min-[960px]:static min-[960px]:col-start-2 min-[960px]:row-start-1 min-[960px]:my-0 min-[960px]:py-0">
          <ModeSwitch tab={tab} onTab={setTab} />
        </div>

        <section className="grid min-w-0 content-start gap-4 min-[960px]:col-start-1 min-[960px]:row-span-2 min-[960px]:row-start-1">
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
            main={{ label: mainButtonLabel(state), onClick: () => session.onMainButton() }}
          />
          <Controls
            steps={text.steps}
            state={state}
            movesCount={events.length}
            onMain={() => session.onMainButton()}
            onFile={(file) => void session.loadFile(file)}
            onReset={() => session.newRoutine()}
            onSwitchCamera={() => void session.switchCamera()}
            onUseCamera={() => void session.useCamera()}
          />
        </section>

        <aside className="grid min-w-0 content-start gap-4 min-[960px]:col-start-2 min-[960px]:row-start-2">
          <PracticePanel text={text} events={events} scores={scores} hidden={tab !== 'practice'} />
          <JudgePanel
            text={text}
            events={events}
            scores={scores}
            form={judgeForm}
            onForm={setJudgeForm}
            onReject={(id, rejected) => session.setRejected(id, rejected)}
            onReport={() => session.openResults()}
            hidden={tab !== 'judge'}
          />
        </aside>
      </main>

      <div ref={resultsRef}>
        {report && (
          <ResultsView
            text={text}
            report={report}
            videos={state.moveVideos}
            videosSaved={state.videosSaved}
            mode={tab}
            details={details}
            onDetails={() => setDetails(!details)}
            onClose={() => session.closeResults()}
          />
        )}
      </div>

      {settingsOpen && (
        <SettingsDrawer session={session} state={state} onExport={() => session.exportAudit(judgeForm)} onClose={closeSettings} />
      )}

      {/* A slim line: name on the left, what the app is (and where the videos stay) in the middle, Saved videos on the right.
          Phones: stacked and centered. */}
      <footer className="flex items-center justify-between gap-x-6 gap-y-1 border-t border-line px-[clamp(16px,4vw,40px)] py-3 text-xs text-muted max-sm:flex-col max-sm:items-center max-sm:text-center print:hidden">
        <span className="flex-none font-brand text-[13px] leading-4 text-ink">Rhymnast</span>
        <p className="m-0 min-w-0 flex-1 leading-4">
          Helps judges and coaches, doesn&apos;t replace them. {text.footerRules} Your videos stay on this device, in this browser.
        </p>
        <Link
          className="flex-none rounded-full leading-4 font-semibold whitespace-nowrap text-accent no-underline transition-opacity duration-150 hover:opacity-80 motion-reduce:transition-none"
          href="/saved"
        >
          Saved videos →
        </Link>
      </footer>
    </div>
  );
}
