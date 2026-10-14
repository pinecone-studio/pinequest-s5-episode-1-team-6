import type { Sport } from '@/lib/sport';
import { AccountButton } from './auth/AccountButton';
import { SportIcon } from './SportIcon';
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
 *   left:  the sport's icon and the name;
 *   right: the Sports menu, then small Sign in / Sign out, Settings and the dark mode switch (the switch
 *          in the top right corner). The last three are quiet on purpose: not the page's main actions.
 * The Practice / Judge switch is not here: it sits on top of the cards it changes (ModeSwitch.tsx).
 * On phones the navbar buttons are icons only and, on the smallest screens, the name is just "R".
 */
export function Header({ sport, judging, onSettings }: HeaderProps) {
  return (
    <>
      <div className="sport-stripe h-1 print:hidden" />
      <nav
        aria-label="Sport, account and settings"
        className="flex min-h-[72px] items-center justify-between gap-3 border-b border-line px-[clamp(16px,4vw,40px)] py-3 max-sm:min-h-16 max-sm:py-2 print:hidden"
      >
        <div className="flex min-w-0 items-center gap-2.5 max-sm:gap-2">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-accent-soft max-sm:h-9 max-sm:w-9">
            <SportIcon sport={sport} size={26} />
          </span>
          <h1 className="m-0 min-w-0 font-brand text-[32px] leading-none text-accent max-sm:text-[26px]">
            <span className="max-[419px]:hidden">Rhymnast</span>
            <span className="min-[420px]:hidden" aria-hidden="true">R</span>
            <span className="sr-only min-[420px]:hidden">Rhymnast</span>
          </h1>
        </div>
        <div className="flex flex-none items-center gap-1.5 max-sm:gap-1">
          <span className="mr-1.5 flex max-sm:mr-0.5">
            <SportMenu sport={sport} disabled={judging} />
          </span>
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
