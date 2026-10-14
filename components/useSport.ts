'use client';

// Which sport is picked, for any component. The sport lives on <html> as data-sport="..." (set before
// the page paints by the script in lib/sport.ts, so the colors are right at once) and in localStorage.
// Nothing picked yet in this browser = rhythmic gymnastics (DEFAULT_SPORT).

import { useSyncExternalStore } from 'react';
import { DEFAULT_SPORT, SPORT_KEY, isSport, type Sport } from '@/lib/sport';

/** Tell React when data-sport on <html> changes (also when another component changes it). */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-sport'] });
  return () => observer.disconnect();
}

function current(): Sport {
  const sport = document.documentElement.dataset.sport;
  return isSport(sport) ? sport : DEFAULT_SPORT;
}

/** The server doesn't know the browser's choice: the first render uses the default. */
const onServer = (): Sport => DEFAULT_SPORT;

/**
 * Picks a sport: saves it in this browser and switches the colors and texts.
 * The new sport's page sweeps in from the right, where the Sports menu is, like a curtain (View
 * Transitions API). The dark mode switch grows a circle instead, so the two changes feel different.
 * Browsers without it, and people who turned on "reduce motion", get an instant change.
 */
export function chooseSport(sport: Sport): void {
  const apply = () => {
    document.documentElement.dataset.sport = sport;
    try {
      localStorage.setItem(SPORT_KEY, sport);
    } catch { /* storage blocked: the sport still changes, it just isn't remembered */ }
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reduceMotion) {
    apply();
    return;
  }

  const transition = document.startViewTransition(async () => {
    apply();
    // Let React draw the new sport's texts (it hears about data-sport a moment later) before the
    // browser takes its picture of the new page.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: ['inset(0 0 0 100%)', 'inset(0 0 0 0)'] },
        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' },
      );
      // The old page darkens a little as it is covered.
      document.documentElement.animate(
        { filter: ['brightness(1)', 'brightness(0.8)'] },
        { duration: 700, easing: 'ease-in', pseudoElement: '::view-transition-old(root)' },
      );
    })
    .catch(() => { /* animation skipped: the sport has already changed */ });
}

export function useSport(): Sport {
  return useSyncExternalStore(subscribe, current, onServer);
}
