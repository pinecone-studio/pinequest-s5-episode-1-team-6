import type { Metadata } from "next";
import { ReferenceVideo } from "@/components/tools/ReferenceVideo";

export const metadata: Metadata = { title: "Reference video · Rhymnast" };

export default function Page() {
  return <ReferenceVideo />;
}
