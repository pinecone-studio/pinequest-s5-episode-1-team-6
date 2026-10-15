import { Suspense } from "react";
import type { Metadata } from "next";
import { JudgePage } from "@/components/competition/JudgePage";
import { ToolPageSkeleton } from "@/components/Skeletons";

export const metadata: Metadata = { title: "Judge · Rhymnast" };

// Opened from the organizer's QR code: /judge?c=<competition>&k=<join key>.
// useSearchParams on a static page needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={<ToolPageSkeleton label="Loading…" />}>
      <JudgePage />
    </Suspense>
  );
}
