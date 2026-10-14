'use client';

// Which sport is picked, for any component. The sport lives on <html> as data-sport="..." (set before
// the page paints by the script in lib/sport.ts, so the colors are right at once) and in localStorage.
// Nothing picked yet in this browser = rhythmic gymnastics (DEFAULT_SPORT).

import { useSyncExternalStore } from 'react';
import { DEFAULT_SPORT, SPORT_KEY, isSport, type Sport } from '@/lib/sport';
import { revealFrom } from './revealFrom';

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
 * The new sport grows as a circle from `from` (the Sports button), like the dark mode switch.
 */
export function chooseSport(sport: Sport, from: Element): void {
  revealFrom(from, async () => {
    document.documentElement.dataset.sport = sport;
    try {
      localStorage.setItem(SPORT_KEY, sport);
    } catch { /* storage blocked: the sport still changes, it just isn't remembered */ }
    // Let React draw the new sport's texts (it hears about data-sport a moment later) before the
    // browser takes its picture of the new page.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

export function useSport(): Sport {
  return useSyncExternalStore(subscribe, current, onServer);
}
