'use client';

// "Sports" in the header: a menu with Rhythmic gymnastics, Cheerleading and Ballet. Picking one
// switches the colors, the texts and the moves the app judges (a new sport starts a new routine,
// so it is off while judging).
// Menu button pattern (WAI-ARIA): Enter / Space / ↓ opens it on the picked sport, ↑ ↓ Home End move,
// Enter picks, Escape or a click outside closes it and focus goes back to the button.

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { SPORTS, SPORT_TEXT, type Sport } from '@/lib/sport';
import { SportIcon } from './SportIcon';
import { chooseSport } from './useSport';

export function SportMenu({ sport, disabled }: { sport: Sport; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Focus the picked sport when the menu opens; close on a click outside.
  useEffect(() => {
    if (!open) return;
    itemRefs.current[SPORTS.indexOf(sport)]?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, sport]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };
  const pick = (next: Sport) => {
    // The new sport grows as a circle from the Sports button.
    if (next !== sport && buttonRef.current) chooseSport(next, buttonRef.current);
    close();
  };

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
    }
  };
  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = itemRefs.current.findIndex((el) => el === document.activeElement);
    const last = SPORTS.length - 1;
    const next = { ArrowDown: i >= last ? 0 : i + 1, ArrowUp: i <= 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (next !== undefined) {
      e.preventDefault();
      itemRefs.current[next]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const text = SPORT_TEXT[sport];
  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="sports-menu"
        disabled={disabled}
        title={disabled ? 'Finish the routine to change sport' : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={onButtonKey}
        aria-label={`Sports: ${text.name}`}
        className="inline-flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-line bg-transparent pr-3.5 pl-1.5 text-base max-sm:min-h-10 max-sm:gap-1.5 max-sm:pr-3 max-sm:text-[15px] font-semibold whitespace-nowrap text-ink transition-colors duration-150 not-disabled:hover:border-accent not-disabled:hover:bg-card disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
      >
        {/* Phones: the short name ("Gymnastics"); narrow phones: the icon only (the label says the name). */}
        <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-accent-soft max-sm:h-7 max-sm:w-7">
          <SportIcon sport={sport} size={20} />
        </span>
        <span className="max-[519px]:hidden">
          <GlidingWidth>
            <span className="max-sm:hidden">{text.name}</span>
            <span className="sm:hidden">{text.short}</span>
          </GlidingWidth>
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className={`flex-none transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          id="sports-menu"
          role="menu"
          aria-label="Sports"
          onKeyDown={onMenuKey}
          className="absolute top-[calc(100%+6px)] right-0 z-20 grid origin-top-right animate-menu-in motion-reduce:animate-none w-[min(300px,calc(100vw-32px))] gap-1 rounded-card border border-line bg-bg p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
        >
          {SPORTS.map((s, i) => (
            <button
              key={s}
              ref={(el) => { itemRefs.current[i] = el; }}
              type="button"
              role="menuitemradio"
              aria-checked={s === sport}
              onClick={() => pick(s)}
              className="flex cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent px-3 py-2.5 text-left text-ink hover:bg-card focus-visible:bg-card aria-checked:bg-accent-soft"
            >
              <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-accent-soft">
                <SportIcon sport={s} size={24} />
              </span>
              <span className="grid min-w-0 flex-1">
                <span className="font-semibold">{SPORT_TEXT[s].name}</span>
                <span className="text-sm text-muted">{SPORT_TEXT[s].menuText}</span>
              </span>
              {s === sport && <span aria-hidden="true" className="font-bold text-accent">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The sport's name in a box that glides to the new name's width when the sport changes (instead of
 * jumping), so the Sports button grows or shrinks smoothly. The box measures its text (ResizeObserver,
 * which also catches web fonts loading and phone / desktop names) and animates its width to match;
 * the text is cut off at the edge while the box is still narrower.
 */
function GlidingWidth({ children }: { children: ReactNode }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      className="inline-block overflow-hidden align-middle transition-[width] duration-300 ease-out motion-reduce:transition-none"
      style={{ width }}
    >
      <span ref={textRef} className="inline-block whitespace-nowrap">
        {children}
      </span>
    </span>
  );
}
