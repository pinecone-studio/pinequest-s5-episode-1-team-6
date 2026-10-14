import { Suspense, type ReactNode } from "react";
import Image from "next/image";
import logo from "@/app/icon.svg";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AuthFormSkeleton } from "@/components/Skeletons";
import { ThemeToggle } from "@/components/ThemeToggle";

// The sign-in pages (/login, /signup). Someone already signed in goes straight on to ?next= or "/".
// AuthScreen reads ?next= from the URL, which needs a Suspense boundary on a static page.
// These pages have no header, so the logo sits in the top left corner and the dark mode switch
// in the top right.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="fixed top-4 left-[clamp(16px,4vw,40px)] z-10">
        <Image src={logo} alt="Rhymnast" width={44} height={44} unoptimized priority />
      </div>
      <div className="fixed top-4 right-[clamp(16px,4vw,40px)] z-10">
        <ThemeToggle />
      </div>
      <Suspense fallback={<AuthFormSkeleton />}>
        <AuthScreen>{children}</AuthScreen>
      </Suspense>
    </>
  );
}
