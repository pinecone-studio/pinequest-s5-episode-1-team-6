import type { KeyboardEvent } from 'react';
import { SPORT_TEXT, type Sport } from '@/lib/sport';
import { AccountButton } from './auth/AccountButton';
import { SportIcon } from './SportIcon';
import { SportMenu } from './SportMenu';
import { ThemeToggle } from './ThemeToggle';
import { navButton } from './ui';

export type Tab = 'practice' | 'judge';

const TABS: { id: Tab; label: string }[] = [
  { id: 'practice', label: 'Practice' },
  { id: 'judge', label: 'Judge' },
];

interface HeaderProps {
  sport: Sport;
  judging: boolean; // the sport can't change while judging
  tab: Tab;
  onTab: (tab: Tab) => void;
  onSettings: () => void;
}

/**
 * Two rows under the sport's stripe:
 *   navbar: the name on the left; small Sign in / Sign out, Settings and the dark mode switch on the
 *           right (the switch in the top right corner). Quiet on purpose: not the page's main actions.
 *   below:  what the page is about, the Sports menu and the Practice / Judge tabs.
 * On phones it fits in two short rows: icons instead of words in the navbar, no line about the page,
 * and the Sports menu and the tabs side by side.
 */
export function Header({ sport, judging, tab, onTab, onSettings }: HeaderProps) {
  // Arrow keys move between the tabs (WAI-ARIA tabs pattern); only the selected tab is in the Tab order.
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const id = TABS[(next + TABS.length) % TABS.length].id;
    onTab(id);
    document.getElementById(`tab-${id}`)?.focus();
  };

  const text = SPORT_TEXT[sport];
  return (
    <>
      <div className="sport-stripe h-1.5 print:hidden" />
      <nav aria-label="Account and settings" className="flex items-center justify-between gap-3 px-[clamp(16px,4vw,40px)] pt-3 print:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-accent-soft">
            <SportIcon sport={sport} size={24} />
          </span>
          <h1 className="m-0 font-display text-[24px] leading-none text-accent">Rhymnast</h1>
        </div>
        <div className="flex min-w-0 items-center gap-1">
          <AccountButton />
          <button className={`${navButton} max-sm:px-2`} aria-controls="settings" aria-label="Settings" onClick={onSettings}>
            <GearIcon />
            <span className="max-sm:hidden">Settings</span>
          </button>
          <span className="ml-1.5 flex max-sm:ml-0.5">
            <ThemeToggle />
          </span>
        </div>
      </nav>
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line px-[clamp(16px,4vw,40px)] pt-3 pb-4 max-sm:pt-2 max-sm:pb-3 print:hidden">
        <p className="m-0 min-w-0 flex-[1_1_320px] text-[15px] text-muted max-sm:hidden">{text.tagline}</p>
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <SportMenu sport={sport} disabled={judging} />
          <div className="flex flex-1 rounded-full bg-card p-1 sm:flex-none" role="tablist" aria-label="View">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => onTab(t.id)}
                onKeyDown={onTabKey}
                className={`inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-full px-[22px] text-base font-semibold max-sm:px-3 sm:flex-none ${
                  tab === t.id ? 'bg-tab text-ink shadow-[0_1px_4px_rgba(29,36,51,0.15)]' : 'bg-transparent text-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>
    </>
  );
}

/** A small cog for the Settings button. */
function GearIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}
