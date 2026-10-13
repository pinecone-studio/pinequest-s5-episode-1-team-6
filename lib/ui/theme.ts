// Dark / light theme: where the choice is saved, and the script that puts it back when a page loads.
// The colors live in app/globals.css (the "dark" class on <html>); the switch is components/ThemeToggle.tsx.

/** localStorage key for the theme picked in this browser: "dark" or "light". */
export const THEME_KEY = 'rhymnast.theme';

/** Runs in <head> before the page paints (app/layout.tsx), so a saved dark theme never flashes light. */
export const restoreThemeScript =
  `try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="dark")` +
  `document.documentElement.classList.add("dark")}catch(e){}`;
