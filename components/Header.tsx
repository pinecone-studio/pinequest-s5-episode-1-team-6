import type { KeyboardEvent } from 'react';
import Image from 'next/image';
import logo from '@/app/icon.svg';
import { AccountButton } from './auth/AccountButton';
import { ThemeToggle } from './ThemeToggle';
import { ghostButton, iconOnPhone } from './ui';

export type Tab = 'practice' | 'judge';

const TABS: { id: Tab; label: string }[] = [
  { id: 'practice', label: 'Practice' },
  { id: 'judge', label: 'Judge' },
];

/** Logo and name, the Practice / Judge tabs, the account, the Settings button and the dark mode switch. */
export function Header({ tab, onTab, onSettings }: { tab: Tab; onTab: (tab: Tab) => void; onSettings: () => void }) {
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

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-2 sm:gap-x-6 md:flex-nowrap gap-y-3.5 border-b border-line px-[clamp(16px,4vw,40px)] py-[18px] print:hidden">
      {/* On phones the tabs drop to their own line below, and the name is smaller and the buttons are
          icons so the logo, name and buttons still fit on one line. From tablet width up everything is on one line. */}
      <h1 className="m-0 flex min-w-0 items-center gap-1.5 text-xl leading-tight font-bold text-accent sm:gap-2.5 sm:text-[26px] md:flex-1">
        <Image src={logo} alt="" width={40} height={40} className="size-7 sm:size-10" unoptimized priority />
        Rhymnast
      </h1>
      <div className="order-3 flex w-full shrink-0 rounded-full bg-card p-1 md:order-none md:w-auto" role="tablist" aria-label="View">
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
            className={`inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-full px-[22px] text-base font-semibold md:flex-none ${
              tab === t.id ? 'bg-tab text-ink shadow-[0_1px_4px_rgba(29,36,51,0.15)]' : 'bg-transparent text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <AccountButton />
        <button className={`${ghostButton} ${iconOnPhone}`} aria-controls="settings" onClick={onSettings}>
          <GearIcon />
          <span className="max-sm:sr-only">Settings</span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}

/** Shown instead of the word "Settings" on phones. */
function GearIcon() {
  return (
    <svg className="size-5 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
