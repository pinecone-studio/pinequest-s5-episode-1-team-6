import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { restoreThemeScript } from "@/lib/ui/theme";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rhymnast",
  description:
    "See which points you lose in your rhythmic gymnastics balances, and why. Decision support for judges and coaches.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script may add the "dark" class before React starts.
    <html lang="en" className={`${figtree.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: restoreThemeScript }} />
      </head>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
