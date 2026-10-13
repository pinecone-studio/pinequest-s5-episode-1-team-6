'use client';

// The safe `?next=` path of the sign-in pages ("/" when there is none). Needs a Suspense boundary
// above it on a static page: app/(auth)/layout.tsx has one.

import { useSearchParams } from 'next/navigation';
import { safeNextPath } from '@/lib/ui/loginRedirect';

export function useNextPath(): string {
  return safeNextPath(useSearchParams().get('next'));
}
