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
  'auth/operation-not-allowed': 'Sign-in is turned off. Turn on Email/Password under Authentication in the Firebase console.',
};

export function authErrorText(code: string): string {
  return MESSAGES[code] ?? 'Something went wrong. Try again.';
}

export function firebaseErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof err.code === 'string') return err.code;
  return '';
}
