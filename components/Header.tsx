import Link from 'next/link';
import type { Sport } from '@/lib/sport';
import { AccountButton } from './auth/AccountButton';
import { BrandLogo } from './BrandLogo';
import { SportMenu } from './SportMenu';
import { ThemeToggle } from './ThemeToggle';
import { navButton, navIconOnly } from './ui';

const iconOnly = navIconOnly.lg;

interface HeaderProps {
  sport: Sport;
  judging: boolean; // the sport can't change while judging
  onSettings: () => void;
}

/**
 * One row under the sport's thin stripe:
 *   left:  the sport's icon and the name;
 *   right: the Sports menu, then small Competition, Sign in / Sign out, Settings and the dark mode switch (the switch
 *          in the top right corner). The last three are quiet on purpose: not the page's main actions.
 * The Practice / Judge switch is not here: it sits on top of the cards it changes (ModeSwitch.tsx).
 *
 * The row must never overlap, so what shows depends on the screen width (measured, 2026-10-15):
 *   under 480 px  the sport's icon only (no name), icon-only buttons; under 360 px (max-xs) all a little smaller
 *   480 px        + the name "Rhymnast"
 *   580 px        + the sport's short name on the Sports button ("Gymnastics"; SportMenu.tsx)
 *   768 px        + the full sport name ("Rhythmic gymnastics"), and the icon and name at full size
 *   1024 px       + the words on Competition, Sign in / Sign out and Settings (navIconOnly.lg in ui.ts)
 *   1280 px       + the signed-in person's name (AccountButton.tsx)
 * The name never shrinks under the buttons: the left side keeps its width (flex-none).
 */
export function Header({ sport, judging, onSettings }: HeaderProps) {
  return (
    <>
      <div className="sport-stripe h-1 print:hidden" />
      <nav
        aria-label="Sport, account and settings"
        className="flex min-h-[72px] items-center justify-between gap-3 border-b border-line px-[clamp(16px,4vw,40px)] py-3 max-sm:min-h-16 max-sm:gap-2 max-sm:py-2 print:hidden"
      >
        <BrandLogo sport={sport} as="h1" />
        <div className="flex min-w-0 items-center gap-1.5 max-sm:gap-1 max-xs:gap-0">
          <span className="mr-1.5 flex max-sm:mr-0.5">
            <SportMenu sport={sport} disabled={judging} />
          </span>
          <Link
            href="/compete"
            className={`${navButton} ${iconOnly.button} no-underline ${judging ? 'pointer-events-none opacity-45' : ''}`}
            aria-label="Competition"
            aria-disabled={judging || undefined}
            tabIndex={judging ? -1 : undefined}
          >
            <TrophyIcon />
            <span className={iconOnly.label}>Competition</span>
          </Link>
          <AccountButton iconOnlyBelow="lg" />
          <button className={`${navButton} ${iconOnly.button}`} aria-controls="settings" aria-label="Settings" onClick={onSettings}>
            <GearIcon />
            <span className={iconOnly.label}>Settings</span>
          </button>
          <span className="ml-1.5 flex max-sm:ml-0.5">
            <ThemeToggle />
          </span>
        </div>
      </nav>
    </>
  );
}

/** A small cup for the Competition link. */
function TrophyIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 6h2.5a1.5 1.5 0 0 1 1.5 1.5v.5a4 4 0 0 1-4 4M7 6H4.5A1.5 1.5 0 0 0 3 7.5V8a4 4 0 0 0 4 4" />
    </svg>
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
