'use client';

// Shared frame for the developer tools (/tools/*), plus a hook that loads the same pose library
// as the app (default examples + poses taught in this browser).

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { setPoseLibrary } from '@/lib/elements/balances';
import { currentLibrary } from '@/lib/ui/libraryStore';
import { AccountButton } from '../auth/AccountButton';
import { ThemeToggle } from '../ThemeToggle';
import { smallText } from '../ui';

export function ToolPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto grid max-w-[1300px] gap-6 px-[clamp(16px,4vw,40px)] pt-8 pb-12">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-[13px] font-semibold text-muted">
            <Link className="text-accent" href="/">Rhymnast</Link> · Developer tool
          </p>
          <div className="flex min-w-0 items-center gap-2.5">
            <AccountButton />
            <ThemeToggle />
          </div>
        </div>
        <h1 className="m-0 text-4xl leading-tight font-bold">{title}</h1>
        <p className={smallText}>{intro}</p>
      </div>
      {children}
    </main>
  );
}

/** Same recognition as the app: default library + poses taught in this browser. */
export function useAppPoseLibrary(): void {
  useEffect(() => setPoseLibrary(currentLibrary()), []);
}
