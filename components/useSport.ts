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

/** Picks a sport: saves it in this browser and switches the colors and texts at once. */
export function chooseSport(sport: Sport): void {
  document.documentElement.dataset.sport = sport;
  try {
    localStorage.setItem(SPORT_KEY, sport);
  } catch { /* storage blocked: the sport still changes, it just isn't remembered */ }
}

export function useSport(): Sport {
  return useSyncExternalStore(subscribe, current, onServer);
}
