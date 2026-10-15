import { Suspense } from "react";
import type { Metadata } from "next";
import { LeaderboardPage } from "@/components/competition/Leaderboard";
import { ToolPageSkeleton } from "@/components/Skeletons";

export const metadata: Metadata = { title: "Leaderboard · Rhymnast" };

// The spectators' screen: /compete/board?c=<competition>. useSearchParams needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={<ToolPageSkeleton label="Loading…" />}>
      <LeaderboardPage />
    </Suspense>
  );
}
