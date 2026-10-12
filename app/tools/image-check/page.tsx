import type { Metadata } from "next";
import { ImageCheck } from "@/components/tools/ImageCheck";

export const metadata: Metadata = { title: "Pose image check · Rhymnast" };

export default function Page() {
  return <ImageCheck />;
}
