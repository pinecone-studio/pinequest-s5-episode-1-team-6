import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";

// Every page in this group (the judging page and the developer tools) needs someone signed in.
// The group folder "(app)" is not part of the URL: app/(app)/page.tsx is still "/".
export default function SignedInLayout({ children }: { children: ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
