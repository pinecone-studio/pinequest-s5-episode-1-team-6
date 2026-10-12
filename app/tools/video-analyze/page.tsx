import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { VideoAnalyze } from "@/components/tools/VideoAnalyze";

export const metadata: Metadata = { title: "Video analysis · Rhymnast" };

export default function Page() {
  return (
    <AuthGate>
      <VideoAnalyze />
    </AuthGate>
  );
}
