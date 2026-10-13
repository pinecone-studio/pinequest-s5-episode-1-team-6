import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckingAccount } from "@/components/auth/AuthMessages";
import { LoginScreen } from "@/components/auth/LoginScreen";

export const metadata: Metadata = { title: "Sign in · Rhymnast" };

// LoginScreen reads ?next= from the URL, which needs a Suspense boundary on a static page.
export default function Page() {
  return (
    <Suspense fallback={<CheckingAccount />}>
      <LoginScreen />
    </Suspense>
  );
}
