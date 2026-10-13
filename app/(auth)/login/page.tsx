import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in · Rhymnast" };

export default function Page() {
  return <SignInForm />;
}
