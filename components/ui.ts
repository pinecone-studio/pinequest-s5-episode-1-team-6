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
/** "Continue with Google": the page color with the app's outline (like the other buttons), plus Google's G. */
export const googleButton = `${button} border-[1.5px] border-line bg-bg text-ink not-disabled:hover:border-accent not-disabled:hover:text-accent`;
/** Small and quiet, for the navbar (Sign in, Settings): text only until hovered. At least 40 × 40 px, to tap. */
export const navButton = 'inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center gap-1.5 rounded-full border-0 bg-transparent px-3.5 text-[15px] font-semibold whitespace-nowrap text-muted transition-colors duration-150 hover:bg-card hover:text-ink motion-reduce:transition-none';

/**
 * A navbar button with only its icon on narrow screens (the word stays its aria-label): add `button` to
 * the button and `label` to the word. "sm": under 640 px (pages with a short navbar); "lg": under
 * 1024 px (the judging page's navbar, which has more in it: see Header.tsx).
 */
export const navIconOnly = {
  sm: { button: 'max-sm:px-0', label: 'max-sm:hidden' },
  lg: { button: 'max-lg:px-0 max-xs:min-w-9', label: 'max-lg:hidden' },
} as const;

/** Add to a button to make it the big one. */
export const bigButton = 'min-h-14 px-8 text-[19px]';

export const input = 'min-h-11 w-full rounded-[10px] border-[1.5px] border-line bg-bg px-3 text-[17px] font-medium text-ink focus:border-accent focus:outline-none';

export const smallText = 'm-0 text-sm text-muted';

/** "Rhymnast" in a page's small breadcrumb (back to the judging page): small text, but 40 px tall to tap. */
export const crumbLink = 'inline-flex min-h-10 items-center text-accent';

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
