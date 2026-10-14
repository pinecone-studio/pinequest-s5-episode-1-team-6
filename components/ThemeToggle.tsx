'use client';

// The day / night sky switch that turns dark mode on and off. Shown in every page header.
// Dark mode is the "dark" class on <html> (colors in app/globals.css). The choice is saved in this
// browser, and the script from lib/ui/theme.ts puts it back before the page paints.
// The switch's look follows the class through Tailwind's dark: variant, so it is right on the first paint.
// On click the new theme grows as a circle from the switch (View Transitions API); browsers without it,
// and people who turned on "reduce motion", get an instant change.
// Size: 58 × 32 px everywhere, the height of the navbar's buttons (it was 80 × 44 and looked too big).

import { useSyncExternalStore, type MouseEvent } from 'react';
import { THEME_KEY } from '@/lib/ui/theme';

/** Tell React when the "dark" class on <html> changes (also when another switch on the page changes it). */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains('dark');
const isDarkOnServer = () => false;

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDark, isDarkOnServer);

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const next = !dark;
    const apply = () => {
      document.documentElement.classList.toggle('dark', next);
      try {
        localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      } catch { /* storage blocked: the theme still changes, it just isn't remembered */ }
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (typeof document.startViewTransition !== 'function' || reduceMotion) {
      apply();
      return;
    }

    // The circle starts at the middle of the switch and grows until it covers the farthest corner.
    const box = event.currentTarget.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 600, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => { /* animation skipped: the theme has already changed */ });
  };

  const fade = 'transition-opacity duration-300 motion-reduce:transition-none';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className="relative h-8 w-[58px] flex-none cursor-pointer overflow-hidden rounded-full bg-sky-day transition-colors duration-500 motion-reduce:transition-none dark:bg-sky-night print:hidden"
    >
      {/* Day: two clouds. */}
      <span aria-hidden="true" className={`absolute top-[9px] right-[9px] h-1.5 w-3.5 rounded-full bg-white dark:opacity-0 ${fade}`} />
      <span aria-hidden="true" className={`absolute top-[17px] right-4 h-1 w-2.5 rounded-full bg-white dark:opacity-0 ${fade}`} />
      {/* Night: three stars. */}
      <span aria-hidden="true" className={`absolute top-2 left-2.5 size-0.5 rounded-full bg-white opacity-0 dark:opacity-100 ${fade}`} />
      <span aria-hidden="true" className={`absolute top-5 left-[17px] size-0.5 rounded-full bg-white opacity-0 dark:opacity-100 ${fade}`} />
      <span aria-hidden="true" className={`absolute top-2.5 left-[22px] size-px rounded-full bg-white opacity-0 dark:opacity-100 ${fade}`} />
      {/* The sun slides right (26 px) and becomes the moon (with two craters). */}
      <span
        aria-hidden="true"
        className="absolute top-1 left-1 size-6 rounded-full bg-sun shadow-[0_1px_4px_rgba(0,0,0,0.25)] transition-[translate,background-color] duration-[450ms] ease-[cubic-bezier(0.5,1.6,0.4,1)] motion-reduce:transition-none dark:translate-x-[26px] dark:bg-moon"
      >
        <span className={`absolute top-1.5 left-1.5 size-[5px] rounded-full bg-crater opacity-0 dark:opacity-100 ${fade}`} />
        <span className={`absolute top-3.5 left-3.5 size-1 rounded-full bg-crater opacity-0 dark:opacity-100 ${fade}`} />
      </span>
    </button>
  );
}
