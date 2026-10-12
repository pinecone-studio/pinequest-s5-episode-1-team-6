import type { Metadata } from "next";
import { VideoAnalyze } from "@/components/tools/VideoAnalyze";

export const metadata: Metadata = { title: "Video analysis · Rhymnast" };

export default function Page() {
  return <VideoAnalyze />;
}
