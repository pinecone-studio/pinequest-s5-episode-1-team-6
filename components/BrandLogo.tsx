import type { Sport } from '@/lib/sport';
import { SportIcon } from './SportIcon';

/**
 * The app's logo at the left of a navbar: the sport's icon in a soft circle and the name "Rhymnast".
 * The same on the judging page (Header.tsx) and the competition pages (CompetitionShell.tsx).
 * Under 480 px only the icon shows (the name stays for screen readers), so the navbar fits on one line.
 */
export function BrandLogo({ sport, as: Name = 'span' }: { sport: Sport; as?: 'h1' | 'span' }) {
  return (
    <div className="flex flex-none items-center gap-2.5 max-md:gap-2">
      <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-accent-soft max-md:h-9 max-md:w-9 max-xs:h-8 max-xs:w-8">
        <SportIcon sport={sport} size={26} />
      </span>
      <Name className="m-0 font-brand text-[32px] leading-none text-accent max-md:text-[26px] max-[479px]:sr-only">Rhymnast</Name>
    </div>
  );
}
