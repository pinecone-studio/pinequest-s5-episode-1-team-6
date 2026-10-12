'use client';

// Settings drawer: camera accuracy, "only the three balances", Teach poses, the record download,
// technical details and links to the developer tools.

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { JudgingSession, SessionState } from '@/lib/session';
import type { ModelVariant } from '@/lib/pose';
import { TeachPanel } from './TeachPanel';
import { ghostButton, input, smallText } from './ui';

interface SettingsProps {
  session: JudgingSession;
  state: SessionState;
  onExport: () => void;
  onClose: () => void;
}

const setting = 'grid gap-2 border-t border-line py-3.5';

export function SettingsDrawer({ session, state, onExport, onClose }: SettingsProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      session.setTechVisible(false);
    };
  }, [session, onClose]);

  const tech = state.tech;
  const techItems: [string, string, string?][] = [
    ['Frames per second', tech.fps == null ? '–' : String(tech.fps), tech.fps == null ? '' : tech.fps >= 15 ? 'text-good' : 'text-bad'],
    ['Legs seen side-on', tech.view ?? '–', tech.view === 'yes' ? 'text-good' : tech.view === 'no' ? 'text-warn' : ''],
    ['Split angle', tech.split],
    ['Shape', tech.shape],
    ['On the toes', tech.releve],
    ['State', tech.state],
  ];

  return (
    <>
      <div className="fixed inset-0 z-10 bg-ink/35 print:hidden" onClick={onClose} />
      <aside
        id="settings"
        aria-labelledby="settings-title"
        className="fixed top-0 right-0 bottom-0 z-11 grid w-[min(420px,100%)] content-start gap-3.5 overflow-y-auto bg-bg px-[22px] pt-5 pb-[calc(24px+env(safe-area-inset-bottom,0px))] shadow-[-8px_0_30px_rgba(0,0,0,0.15)] print:hidden"
      >
        <div className="flex items-center justify-between">
          <h2 id="settings-title" className="m-0 text-xl leading-tight font-bold">Settings</h2>
          <button ref={closeRef} className={ghostButton} onClick={onClose}>Close</button>
        </div>

        <section className={setting}>
          <label htmlFor="model-select"><b>Camera accuracy</b></label>
          <select
            id="model-select"
            className={input}
            value={state.model}
            onChange={(e) => void session.setModel(e.target.value as ModelVariant)}
          >
            <option value="heavy">Best for splits (slower to load)</option>
            <option value="full">Faster</option>
            <option value="lite">Fastest (older laptops)</option>
          </select>
        </section>

        <section className={setting}>
          <label className="flex items-start gap-2.5 text-base">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 accent-accent"
              checked={state.focusOnly}
              onChange={(e) => session.setFocusOnly(e.target.checked)}
            />
            Only judge the three balances (front split, back split, attitude)
          </label>
        </section>

        <section className={setting}>
          <TeachPanel session={session} recording={state.teachRecording} status={state.teachStatus} />
        </section>

        <section className={setting}>
          <b>Records</b>
          <p className={smallText}>A complete record of every call, for the competition file.</p>
          <button className={ghostButton} onClick={onExport}>Download record (JSON)</button>
        </section>

        <section className={setting}>
          <details onToggle={(e) => session.setTechVisible(e.currentTarget.open)}>
            <summary><b>Technical details</b></summary>
            <dl className="my-2.5 grid grid-cols-2 gap-2">
              {techItems.map(([label, value, color]) => (
                <div key={label} className="rounded-lg bg-card px-2.5 py-2">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className={`m-0 font-semibold ${color ?? ''}`}>{value}</dd>
                </div>
              ))}
            </dl>
            <p className={smallText}>
              Developer tools: <Link className="text-accent" href="/tools/video-analyze">video analysis</Link> ·{' '}
              <Link className="text-accent" href="/tools/validate">photo validation</Link> ·{' '}
              <Link className="text-accent" href="/tools/image-check">single photo</Link>
            </p>
          </details>
        </section>
      </aside>
    </>
  );
}
