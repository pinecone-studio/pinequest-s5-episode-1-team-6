import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { Validate } from "@/components/tools/Validate";

export const metadata: Metadata = { title: "Balance validation · Rhymnast" };

export default function Page() {
  return (
    <AuthGate>
      <Validate />
    </AuthGate>
  );
}
