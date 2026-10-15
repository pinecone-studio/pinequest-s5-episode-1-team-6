import { Suspense } from "react";
import type { Metadata } from "next";
import { CompetePage } from "@/components/competition/CompetePage";
import { ToolPageSkeleton } from "@/components/Skeletons";

export const metadata: Metadata = { title: "Competition · Rhymnast" };

// The competition id is in the URL (?c=…), read with useSearchParams: that needs a Suspense
// boundary on a static page.
export default function Page() {
  return (
    <Suspense fallback={<ToolPageSkeleton label="Loading…" />}>
      <CompetePage />
    </Suspense>
  );
}
