'use client';

// "Choose your sport": two big cards. Shown on the judging page until a sport is picked in this
// browser; afterwards the switch in the header changes it. Each card shows the sport's own colors
// (data-sport on the card), so people see what they are picking.

import { SPORTS, SPORT_TEXT } from '@/lib/sport';
import { AccountButton } from './auth/AccountButton';
import { SportIcon } from './SportIcon';
import { ThemeToggle } from './ThemeToggle';
import { chooseSport } from './useSport';

export function SportPicker() {
  return (
    <>
      <div className="sport-stripe h-1.5" />
      <header className="flex items-center justify-between gap-4 px-[clamp(16px,4vw,40px)] py-[18px]">
        <span className="font-display text-[26px] leading-tight text-accent">Rhymnast</span>
        <div className="flex items-center gap-2.5">
          <AccountButton />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto grid max-w-[880px] gap-6 px-[clamp(16px,4vw,40px)] pt-6 pb-12">
        <div className="grid gap-1.5 text-center">
          <h1 className="m-0 font-display text-[36px] leading-tight">Choose your sport</h1>
          <p className="m-0 text-muted">You can change it at any time at the top of the page.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {SPORTS.map((sport) => {
            const text = SPORT_TEXT[sport];
            return (
              // data-sport gives the card that sport's colors, whatever the page has now.
              <button
                key={sport}
                type="button"
                data-sport={sport}
                onClick={() => chooseSport(sport)}
                className="group grid cursor-pointer content-start gap-3 overflow-hidden rounded-card border-[1.5px] border-line bg-card p-0 text-left text-ink shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-transform duration-200 hover:-translate-y-1 hover:border-accent motion-reduce:transition-none"
              >
                <span className="sport-stripe block h-2" />
                <span className="grid gap-3 px-6 pt-4 pb-6">
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-accent-soft">
                    <SportIcon sport={sport} size={40} />
                  </span>
                  <span className="font-display text-[30px] leading-tight">{text.name}</span>
                  <span className="text-[15px] text-muted">{text.pickerText}</span>
                  <span className="mt-1 inline-flex min-h-11 w-fit items-center rounded-full bg-accent px-[18px] font-semibold text-on-fill group-hover:brightness-105">
                    Judge {text.short.toLowerCase()}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </>
  );
}
