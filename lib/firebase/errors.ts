// Plain sentences for the Firebase Auth error codes the sign-in form can hit.

const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/invalid-email': 'That email does not look right.',
  'auth/invalid-credential': 'Email or password is wrong.',
  'auth/wrong-password': 'Email or password is wrong.',
  'auth/user-not-found': 'Email or password is wrong.',
  'auth/weak-password': 'Use a password of at least 6 characters.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
  'auth/network-request-failed': 'Could not reach the sign-in service. Check your internet and try again.',
  'auth/configuration-not-found': 'Sign-in is turned off. Turn on Email/Password under Authentication in the Firebase console.',
  'auth/operation-not-allowed': 'This way of signing in is turned off. Turn it on under Authentication → Sign-in method in the Firebase console.',
  'auth/popup-closed-by-user': 'The Google window was closed before you finished. Try again.',
  'auth/cancelled-popup-request': 'The Google window was closed before you finished. Try again.',
  'auth/popup-blocked': 'The browser blocked the Google window. Allow pop-ups for this site and try again.',
  'auth/unauthorized-domain': 'Google sign-in is not allowed on this website yet. Add it under Authentication → Settings → Authorized domains.',
  'auth/account-exists-with-different-credential': 'That email already has an account. Sign in with email and password.',
  'auth/admin-restricted-operation': 'Trying without an account is turned off. Turn on Anonymous under Authentication → Sign-in method in the Firebase console.',
};

export function authErrorText(code: string): string {
  return MESSAGES[code] ?? 'Something went wrong. Try again.';
}

export function firebaseErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') return err.code;
  return '';
}
