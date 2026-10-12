// Public Firebase web settings. These are safe to ship in the browser (Firebase's own rules).
// Real values live in .env.local, never in git. See .env.example.

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

/** Names Next.js inlines into the browser bundle. Keep each `process.env.NEXT_PUBLIC_*` access direct. */
export const FIREBASE_PUBLIC_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

export type FirebasePublicKey = (typeof FIREBASE_PUBLIC_KEYS)[number];

export function readFirebaseConfig(
  env: Partial<Record<FirebasePublicKey, string | undefined>>,
): { ok: true; config: FirebaseWebConfig } | { ok: false; missing: FirebasePublicKey[] } {
  const missing = FIREBASE_PUBLIC_KEYS.filter((key) => !env[key]?.trim());
  if (missing.length > 0) return { ok: false, missing };
  return {
    ok: true,
    config: {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY!.trim(),
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!.trim(),
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!.trim(),
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID!.trim(),
    },
  };
}

/** Read the four public values. Call this from client code so Next.js can inline them. */
export function firebaseConfigFromProcessEnv(): ReturnType<typeof readFirebaseConfig> {
  return readFirebaseConfig({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
}
