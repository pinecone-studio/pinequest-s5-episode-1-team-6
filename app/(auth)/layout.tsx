import { Suspense, type ReactNode } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { CheckingAccount } from "@/components/auth/AuthMessages";

// The sign-in pages (/login, /signup). Someone already signed in goes straight on to ?next= or "/".
// AuthScreen reads ?next= from the URL, which needs a Suspense boundary on a static page.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<CheckingAccount />}>
      <AuthScreen>{children}</AuthScreen>
    </Suspense>
  );
}
