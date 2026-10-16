'use client';

// The frame of the competition pages (organizer and judge): the judging page's navbar (the Rhymnast
// logo, a link home; the account and the dark mode switch on the right), then a small label for the
// page, a heading and one line about the page.

import type { ReactNode } from 'react';
import Link from 'next/link';
import { AccountButton } from '../auth/AccountButton';
import { BrandLogo } from '../BrandLogo';
import { ThemeToggle } from '../ThemeToggle';
import { useSport } from '../useSport';
import { smallText } from '../ui';

interface ShellProps {
  /** Small label above the heading ("Competition", "Judge"); not shown when it repeats the heading. */
  crumb: string;
  title: ReactNode;
  intro?: ReactNode;
  /** Buttons on the right of the heading (e.g. Start competition). */
  actions?: ReactNode;
  /** Wider pages (the organizer's dashboard) use the judging page's width. */
  wide?: boolean;
  children: ReactNode;
}

export function CompetitionShell({ crumb, title, intro, actions, wide = false, children }: ShellProps) {
  const sport = useSport();
  return (
    <>
      <div className="sport-stripe h-1 print:hidden" />
      <nav
        aria-label="Home and account"
        className="flex min-h-[72px] items-center justify-between gap-3 border-b border-line px-[clamp(16px,4vw,40px)] py-3 max-sm:min-h-16 max-sm:gap-2 max-sm:py-2 print:hidden"
      >
        <Link href="/" className="no-underline" aria-label="Rhymnast, home">
          <BrandLogo sport={sport} />
        </Link>
        <div className="flex min-w-0 items-center gap-1.5 max-sm:gap-1 max-xs:gap-0">
          <AccountButton />
          <span className="ml-1.5 flex max-sm:ml-0.5">
            <ThemeToggle />
          </span>
        </div>
      </nav>
      <main className={`mx-auto grid w-full gap-6 px-[clamp(16px,4vw,40px)] pt-6 pb-12 ${wide ? 'max-w-[1400px]' : 'max-w-[1000px]'}`}>
        <div className="grid gap-1">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="grid min-w-0 gap-1">
              {crumb !== title && <p className="m-0 text-[13px] font-semibold text-muted">{crumb}</p>}
              <h1 className="m-0 font-display text-4xl leading-tight break-words">{title}</h1>
              {intro && <p className={smallText}>{intro}</p>}
            </div>
            {actions}
          </div>
        </div>
        {children}
      </main>
    </>
  );
}

/** A rounded panel, like the cards on the judging page. */
export const card = 'grid content-start gap-4 rounded-card bg-card p-5 max-sm:p-4';

/** A card's heading. */
export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="m-0 font-display text-[22px] leading-tight">{children}</h2>
      {aside}
    </div>
  );
}

/** One line for loading and error states. */
export function StatusLine({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return (
    <p className={`m-0 rounded-card bg-card px-5 py-4 ${error ? 'text-bad' : 'text-muted'}`} role={error ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
