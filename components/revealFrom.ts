// A page-wide change (dark mode, a new sport) that grows as a circle from the button that made it
// (View Transitions API), so everything visibly starts from one place.
// Browsers without it, and people who turned on "reduce motion", get an instant change.

/**
 * Runs `apply` (which changes the page) and reveals the result as a circle growing from the middle of
 * `from`. `apply` may be async: the browser waits for it before taking its picture of the new page.
 */
export function revealFrom(from: Element, apply: () => void | Promise<void>): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (typeof document.startViewTransition !== 'function' || reduceMotion) {
    void apply();
    return;
  }

  // The circle starts at the middle of the button and grows until it covers the farthest corner.
  const box = from.getBoundingClientRect();
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
    .catch(() => { /* animation skipped: the page has already changed */ });
}
