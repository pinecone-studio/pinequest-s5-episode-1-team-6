import type { KeyboardEvent } from 'react';
import { SPORT_TEXT, type Sport } from '@/lib/sport';
import { AccountButton } from './auth/AccountButton';
import { SportIcon } from './SportIcon';
import { SportSwitch } from './SportSwitch';
import { ThemeToggle } from './ThemeToggle';
import { ghostButton } from './ui';

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
 * The sport's stripe, name and sport, the Practice / Judge tabs, the sport switch, the account,
 * the Settings button and the dark mode switch.
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
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3.5 border-b border-line px-[clamp(16px,4vw,40px)] py-[18px] print:hidden">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-accent-soft">
            <SportIcon sport={sport} size={30} />
          </span>
          <div>
            <h1 className="m-0 font-display text-[26px] leading-tight text-accent">
              Rhymnast <span className="text-ink">{text.name}</span>
            </h1>
            <p className="mt-0.5 mb-0 text-[15px] text-muted">{text.tagline}</p>
          </div>
        </div>
        <div className="order-3 flex w-full rounded-full bg-card p-1 sm:order-none sm:w-auto" role="tablist" aria-label="View">
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
              className={`inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-full px-[22px] text-base font-semibold sm:flex-none ${
                tab === t.id ? 'bg-tab text-ink shadow-[0_1px_4px_rgba(29,36,51,0.15)]' : 'bg-transparent text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <SportSwitch sport={sport} disabled={judging} />
          <AccountButton />
          <button className={ghostButton} aria-controls="settings" onClick={onSettings}>Settings</button>
          <ThemeToggle />
        </div>
      </header>
    </>
  );
}
