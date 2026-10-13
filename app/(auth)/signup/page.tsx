import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Create account · Rhymnast" };

export default function Page() {
  return <SignUpForm />;
}
