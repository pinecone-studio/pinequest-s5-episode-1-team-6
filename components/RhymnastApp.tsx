'use client';

// The whole judging page. The session (lib/session.ts) runs the camera, pose model and judging;
// this component lays out the page and passes clicks to it.
// Two tabs show the same judging for two audiences:
//   Practice (gymnast / coach): moves, points lost, one tip each
//   Judge: final score, artistry entry, agree / disagree with each call, full report

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildReport } from '@/lib/report';
import { useJudgingSession } from './useJudgingSession';
import { Header, type Tab } from './Header';
import { Stage } from './Stage';
import { Controls } from './Controls';
import { JudgePanel, PracticePanel, type JudgeForm } from './SidePanels';
import { ResultsView } from './ResultsView';
import { SettingsDrawer } from './SettingsDrawer';

const TAB_KEY = 'rhymnast.tab';

export function RhymnastApp() {
  const { session, state } = useJudgingSession();
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [tab, setTabState] = useState<Tab>('practice');
  const [details, setDetails] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [judgeForm, setJudgeForm] = useState<JudgeForm>({ artistry: '0', extraD: '0', extraE: '0', penalties: '0' });

  // Connect the session to the video once the page is in the browser.
  useEffect(() => session.attach(videoRef.current!, canvasRef.current!, stageRef.current!), [session]);

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
  const report = state.resultsOpen ? buildReport(session.scoreboard, judgeForm, { durationMs: state.resultsDurationMs }) : null;

  return (
    <>
      <Header tab={tab} onTab={setTab} onSettings={() => setSettingsOpen(true)} />

      <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-[clamp(16px,4vw,40px)] pt-6 pb-8 min-[960px]:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] print:hidden">
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
          />
          <Controls
            state={state}
            movesCount={events.length}
            onMain={() => session.onMainButton()}
            onFile={(file) => void session.loadFile(file)}
            onReset={() => session.newRoutine()}
            onSwitchCamera={() => void session.switchCamera()}
          />
        </section>

        <aside className="grid min-w-0 content-start gap-4">
          <PracticePanel events={events} scores={scores} hidden={tab !== 'practice'} />
          <JudgePanel
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
            report={report}
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

      <footer className="border-t border-line px-[clamp(16px,4vw,40px)] pt-4 pb-7 text-center text-[13px] text-muted print:hidden">
        Rhymnast helps judges and coaches; it doesn&apos;t replace them. Rules: FIG Rhythmic Gymnastics Code of Points
        2025–2028. Your video stays on this device.
      </footer>
    </>
  );
}
