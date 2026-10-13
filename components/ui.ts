// Tailwind class names shared by many components, so every button and input looks the same.
// Colors come from the theme in app/globals.css.

import type { Tone } from '@/lib/ui/plain';

const button = 'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-[18px] text-base leading-none font-semibold not-disabled:hover:brightness-105 disabled:cursor-default disabled:opacity-45';

/** Blue main action. */
export const primaryButton = `${button} bg-accent text-on-fill`;
/** Light blue, for second actions. */
export const secondaryButton = `${button} bg-accent-soft text-accent`;
/** Outline only, for small actions (Close, Print, ...). */
export const ghostButton = `${button} border-[1.5px] border-line bg-transparent text-ink not-disabled:hover:border-accent not-disabled:hover:text-accent`;
/** Small and quiet, for the navbar (Sign in, Settings): text only until hovered. */
export const navButton = 'inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border-0 bg-transparent px-3 text-sm font-semibold whitespace-nowrap text-muted hover:bg-card hover:text-ink';

/** Add to a button to make it the big one. */
export const bigButton = 'min-h-14 px-8 text-[19px]';

export const input = 'min-h-11 w-full rounded-[10px] border-[1.5px] border-line bg-bg px-3 text-[17px] font-medium text-ink focus:border-accent focus:outline-none';

export const smallText = 'm-0 text-sm text-muted';

/** Colored left edge of a move card or row: green / orange / red. */
export const toneBorder: Record<Tone | 'idle', string> = {
  good: 'border-l-good',
  warn: 'border-l-warn',
  bad: 'border-l-bad',
  idle: 'border-l-muted',
};

/** Small colored label ("No points lost", "0.30 points lost"). */
export const chip: Record<Tone | 'muted', string> = {
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  muted: 'bg-card text-muted',
};

export const toneText: Record<Tone, string> = {
  good: 'text-good',
  warn: 'text-warn',
  bad: 'text-bad',
};
