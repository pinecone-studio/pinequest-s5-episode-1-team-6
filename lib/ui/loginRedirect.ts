// Where the sign-in pages send you back to. `next` comes from the URL, so only same-site paths
// are allowed (no "//other.site" or "https://..."): otherwise a link could send you to another site.

export const LOGIN_PATH = '/login';
export const SIGNUP_PATH = '/signup';
const AUTH_PATHS = [LOGIN_PATH, SIGNUP_PATH];

/** The sign-in page URL that returns to `pathname` afterwards. */
export function loginPath(pathname: string): string {
  return withNext(LOGIN_PATH, pathname);
}

/** `path` plus `?next=` when there is somewhere other than "/" to go back to. */
export function withNext(path: string, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  return safe === '/' ? path : `${path}?next=${encodeURIComponent(safe)}`;
}

/** A same-site path to go to after signing in, or "/" when `raw` is missing or not safe. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/';
  const isAuthPage = AUTH_PATHS.some((p) => raw === p || raw.startsWith(`${p}?`) || raw.startsWith(`${p}/`));
  return isAuthPage ? '/' : raw;
}
