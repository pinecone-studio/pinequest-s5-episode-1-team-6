// A small drawing for each sport: a ribbon for rhythmic gymnastics, a megaphone for cheerleading,
// a dancer in arabesque for ballet.
// Colors come from the theme (accent and spark), so they follow the sport and dark mode;
// `mono` draws it in the text color instead (on a colored button).

import type { Sport } from '@/lib/sport';

export function SportIcon({ sport, size = 28, mono = false }: { sport: Sport; size?: number; mono?: boolean }) {
  // Whole class names: Tailwind only finds classes written out in full.
  const fill = mono ? 'fill-current' : 'fill-accent';
  const stroke = mono ? 'stroke-current' : 'stroke-accent';
  const stroke2 = mono ? 'stroke-current' : 'stroke-spark';
  if (sport === 'ballet') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        {/* Dancer in arabesque: head, arms, tutu, standing leg, working leg behind. */}
        <circle cx="12.5" cy="5.5" r="2.6" className={fill} />
        <path d="M13 9l1.6 8" className={stroke} fill="none" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M13.4 11.5 5 8.5M13.4 11.5l8.2-4.5" className={stroke2} fill="none" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="14.8" cy="17.4" rx="7.2" ry="2.1" className={mono ? 'fill-current' : 'fill-spark'} />
        <path d="M14 18.5l-.5 11M15.8 18.5l11-2.5" className={stroke} fill="none" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (sport === 'cheer') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        {/* Megaphone: bell, mouthpiece, handle, and two sound lines. */}
        <path d="M5 13h4l12-7v20l-12-7H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Z" className={fill} />
        <path d="M9 19l2 7h3l-1.5-6.2" className={fill} />
        <path d="M25 11.5c1.6 1.2 2.5 2.8 2.5 4.5s-.9 3.3-2.5 4.5" className={stroke2} fill="none" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M24 14.6c.5.4.8.9.8 1.4s-.3 1-.8 1.4" className={stroke2} fill="none" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {/* Ribbon on a stick, swirling. */}
      <path d="M4 28 13 19" className={stroke} strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M13 19c4-4 1-9 5-12s9 0 8 4-7 3-8 7 5 7 9 4"
        className={stroke2}
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
