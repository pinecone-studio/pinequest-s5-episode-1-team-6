import type { Metadata } from "next";
import { SavedVideos } from "@/components/SavedVideos";

export const metadata: Metadata = { title: "Saved videos · Rhymnast" };

export default function Page() {
  return <SavedVideos />;
}
