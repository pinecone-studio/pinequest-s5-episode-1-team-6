// Gray placeholder shapes shown while the account is being checked, laid out like the page that is
// coming so nothing jumps when it appears. Screen readers hear the label instead of the shapes.
// Keep each skeleton's spacing in step with its page (Header + RhymnastApp, ToolPage, the sign-in forms).

import type { ReactNode } from 'react';

const gutter = 'px-[clamp(16px,4vw,40px)]';

/** One gray block. Pulses unless the person asked for less motion. */
function Bone({ className = '' }: { className?: string }) {
  return <div className={`rounded-md bg-line motion-safe:animate-pulse ${className}`} />;
}

function SkeletonPage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** The judging page: header, video, main button, three steps, side panel. */
export function JudgingPageSkeleton({ label = 'Checking your account…' }: { label?: string }) {
  return (
    <SkeletonPage label={label}>
      <div className={`flex min-h-[72px] items-center justify-between gap-3 border-b border-line ${gutter} py-3 max-sm:min-h-16`}>
        <div className="flex items-center gap-2.5">
          <Bone className="h-11 w-11 rounded-full max-sm:h-9 max-sm:w-9" />
          <Bone className="h-8 w-40 max-sm:w-28" />
        </div>
        <div className="flex items-center gap-1.5">
          <Bone className="h-11 w-48 rounded-full max-sm:h-10 max-sm:w-28" />
          <Bone className="h-10 w-24 rounded-full max-sm:hidden" />
          <Bone className="h-8 w-[58px] rounded-full" />
        </div>
      </div>
      <div className={`mx-auto grid max-w-[1400px] grid-cols-1 gap-x-6 gap-y-4 ${gutter} pt-6 pb-8 min-[960px]:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] min-[960px]:grid-rows-[auto_1fr]`}>
        <Bone className="h-12 w-full rounded-full min-[960px]:col-start-2 min-[960px]:row-start-1" />
        <div className="grid min-w-0 content-start gap-4 min-[960px]:col-start-1 min-[960px]:row-span-2 min-[960px]:row-start-1">
          <Bone className="aspect-video w-full rounded-card" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Bone className="h-14 w-full rounded-full sm:w-52" />
            <Bone className="h-5 w-32" />
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {[0, 1, 2].map((i) => <Bone key={i} className="h-[52px] rounded-xl" />)}
          </div>
        </div>
        <div className="grid content-start gap-3.5 rounded-card bg-card p-5 min-[960px]:col-start-2 min-[960px]:row-start-2">
          <Bone className="h-6 w-32" />
          <Bone className="h-5 w-48" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-3/4" />
        </div>
      </div>
    </SkeletonPage>
  );
}

/** A developer tool page (ToolPage): small breadcrumb, big title, intro, one work area. */
export function ToolPageSkeleton({ label = 'Checking your account…' }: { label?: string }) {
  return (
    <SkeletonPage label={label}>
      <div className={`mx-auto grid max-w-[1300px] gap-6 ${gutter} pt-8 pb-12`}>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <Bone className="h-4 w-44" />
            <Bone className="h-11 w-24 rounded-full" />
          </div>
          <Bone className="h-10 w-80 max-w-full" />
          <Bone className="h-4 w-full max-w-2xl" />
        </div>
        <Bone className="h-72 w-full rounded-card" />
      </div>
    </SkeletonPage>
  );
}

/** The sign-in and sign-up forms (AuthFrame + formCard). */
export function AuthFormSkeleton({ label = 'Checking your account…' }: { label?: string }) {
  return (
    <SkeletonPage label={label}>
      <div className={`mx-auto grid min-h-dvh max-w-md content-center gap-5 ${gutter} py-16`}>
        <div className="grid justify-items-center gap-2.5">
          <Bone className="h-10 w-44" />
          <Bone className="h-4 w-56 max-w-full" />
        </div>
        <div className="grid gap-3 rounded-card bg-card p-5">
          {[0, 1].map((i) => (
            <div key={i} className="grid gap-1.5">
              <Bone className="h-4 w-20" />
              <Bone className="h-11 w-full rounded-[10px]" />
            </div>
          ))}
          <Bone className="mt-1 h-11 w-full rounded-full" />
          <Bone className="h-11 w-full rounded-full" />
          <Bone className="h-11 w-full rounded-full" />
          <Bone className="mx-auto mt-2 h-4 w-48" />
        </div>
      </div>
    </SkeletonPage>
  );
}
