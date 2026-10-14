import type { Sport } from '@/lib/sport';
import { AccountButton } from './auth/AccountButton';
import { SportMenu } from './SportMenu';
import { ThemeToggle } from './ThemeToggle';
import { navButton } from './ui';

interface HeaderProps {
  sport: Sport;
  judging: boolean; // the sport can't change while judging
  onSettings: () => void;
}

/**
 * One row under the sport's thin stripe:
 *   left:  the name and the Sports menu (it changes the whole theme, so it sits with the name);
 *   right: small Sign in / Sign out, Settings and the dark mode switch (the switch in the top right corner).
 *          Quiet on purpose: not the page's main actions.
 * The Practice / Judge switch is not here: it sits on top of the cards it changes (ModeSwitch.tsx).
 * On phones the navbar buttons are icons only and, on the smallest screens, the name is just "R".
 */
export function Header({ sport, judging, onSettings }: HeaderProps) {
  return (
    <>
      <div className="sport-stripe h-1 print:hidden" />
      <nav
        aria-label="Sport, account and settings"
        className="flex min-h-14 items-center justify-between gap-3 border-b border-line px-[clamp(16px,4vw,40px)] py-2 max-sm:min-h-13 print:hidden"
      >
        <div className="flex min-w-0 items-center gap-3 max-sm:gap-2">
          <h1 className="m-0 font-display text-[24px] leading-none text-accent">
            <span className="max-[379px]:hidden">Rhymnast</span>
            <span className="min-[380px]:hidden" aria-hidden="true">R</span>
            <span className="sr-only min-[380px]:hidden">Rhymnast</span>
          </h1>
          <SportMenu sport={sport} disabled={judging} />
        </div>
        <div className="flex flex-none items-center gap-1">
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
