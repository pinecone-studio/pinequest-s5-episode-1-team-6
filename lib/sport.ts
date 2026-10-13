// The two sports the app judges, and the words that change with them.
// The chosen sport is saved in this browser and set as data-sport="..." on <html> before the page
// paints (same idea as the dark theme, lib/ui/theme.ts), so each sport's colors (app/globals.css)
// never flash the other sport's. The switch is components/SportSwitch.tsx.

export type Sport = 'gymnastics' | 'cheer';

export const SPORTS: Sport[] = ['gymnastics', 'cheer'];

/** localStorage key for the sport picked in this browser. */
export const SPORT_KEY = 'rhymnast.sport';

export function isSport(value: unknown): value is Sport {
  return value === 'gymnastics' || value === 'cheer';
}

/** Runs in <head> before the page paints (app/layout.tsx): puts the saved sport on <html>. */
export const restoreSportScript =
  `try{var s=localStorage.getItem(${JSON.stringify(SPORT_KEY)});` +
  `if(s==="gymnastics"||s==="cheer")document.documentElement.dataset.sport=s}catch(e){}`;

/** Everything on the screens that says something different per sport. Plain words (CLAUDE.md #8). */
export interface SportText {
  name: string; // "Rhythmic gymnastics"
  short: string; // "Gymnastics"
  emoji: string;
  tagline: string; // under the app name
  pickerText: string; // on the sport picker card
  athlete: string; // "gymnast" / "athlete"
  artistry: string; // the judges' own score
  extraHelp: string; // "Points the app can't see"
  watches: string; // which moves the app watches
  emptyPractice: string;
  startMessage: { title: string; detail: string };
  idleLive: string; // live box when nothing is happening
  steps: [string, string, string];
  noMoves: string; // results when nothing was recognized
  correctMove: string; // a move with no mistakes, in the results
  footerRules: string;
}

export const SPORT_TEXT: Record<Sport, SportText> = {
  gymnastics: {
    name: 'Rhythmic gymnastics',
    short: 'Gymnastics',
    emoji: '🎀',
    tagline: 'See which points you lose in your balances, leaps and turns, and why.',
    pickerText: 'Balances, leaps and turns, judged with the FIG Code of Points.',
    athlete: 'gymnast',
    artistry: 'Artistry',
    extraHelp: 'For apparatus work, dance steps and other moves the app doesn\'t judge.',
    watches: 'The app watches four balances (front split, back split, arabesque, attitude), the stag leap and the attitude turn.',
    emptyPractice: 'Press Start, then hold a balance for 1 second, jump or turn.',
    startMessage: { title: 'Turn on the camera to begin', detail: 'Stand sideways to the camera, with your whole body in the picture.' },
    idleLive: 'Ready. Hold a balance, do a stag leap or an attitude turn.',
    steps: ['Turn on the camera', 'Stand sideways, whole body in view', 'Press Start and hold each balance for 1 second'],
    noMoves: 'Stand sideways to the camera with your whole body and both feet in the picture, and hold each balance for at least 1 second.',
    correctMove: 'Correct shape, held for 1 second.',
    footerRules: 'Rules: FIG Rhythmic Gymnastics Code of Points 2025–2028.',
  },
  cheer: {
    name: 'Cheerleading',
    short: 'Cheer',
    emoji: '📣',
    tagline: 'See which points you lose in your jumps and motions, and why.',
    pickerText: 'Jumps and arm motions, judged on height, placement and straight arms and legs.',
    athlete: 'athlete',
    artistry: 'Showmanship',
    extraHelp: 'For stunts, pyramids, tumbling and other skills the app doesn\'t judge.',
    watches: 'The app watches 5 jumps (toe touch, pike, herkie, tuck, spread eagle) and 8 arm motions (High V, Low V, T, touchdown, diagonal, L, punch, broken T).',
    emptyPractice: 'Press Start, then hit a motion (like a High V) or do a jump.',
    startMessage: { title: 'Turn on the camera to begin', detail: 'Face the camera, with your whole body and both arms in the picture.' },
    idleLive: 'Ready. Hit a motion or do a jump.',
    steps: ['Turn on the camera', 'Face the camera, whole body in view', 'Press Start, hit your motions and jump'],
    noMoves: 'Face the camera with your whole body and both arms in the picture. Hit each motion and hold it for a moment; film pikes and tucks from the side.',
    correctMove: 'Right on target.',
    footerRules: 'Cheer rules: a team-made technique rubric, not an official score sheet.',
  },
};
