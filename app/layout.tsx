import type { Metadata } from "next";
import { Bebas_Neue, Figtree, Playfair_Display } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { restoreThemeScript } from "@/lib/ui/theme";
import { restoreSportScript } from "@/lib/sport";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

// Heading fonts, one per sport (app/globals.css picks one by data-sport on <html>):
// an elegant serif for rhythmic gymnastics, a bold varsity-style face for cheerleading.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});
const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rhymnast",
  description:
    "See which points you lose in rhythmic gymnastics and cheerleading, and why. Decision support for judges and coaches.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme and sport scripts may add the "dark" class and data-sport
    // before React starts.
    <html lang="en" className={`${figtree.variable} ${playfair.variable} ${bebas.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: restoreThemeScript }} />
        <script dangerouslySetInnerHTML={{ __html: restoreSportScript }} />
      </head>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
