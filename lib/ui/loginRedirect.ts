// Where the sign-in page sends you back to. `next` comes from the URL, so only same-site paths
// are allowed (no "//other.site" or "https://..."): otherwise a link could send you to another site.

export const LOGIN_PATH = '/login';

/** The sign-in page URL that returns to `pathname` afterwards. */
export function loginPath(pathname: string): string {
  const next = safeNextPath(pathname);
  return next === '/' ? LOGIN_PATH : `${LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}

/** A same-site path to go to after signing in, or "/" when `raw` is missing or not safe. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  if (raw === LOGIN_PATH || raw.startsWith(`${LOGIN_PATH}?`) || raw.startsWith(`${LOGIN_PATH}/`)) return '/';
  return raw;
}
