import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { TriangleAlert } from "lucide-react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Marketingstrategie-Prototyp",
  description:
    "Prozessgeführtes Unterstützungssystem für die Marketingstrategieentwicklung von Start-ups (Bachelorarbeit-Prototyp)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <div
          role="note"
          className="flex items-center gap-2 border-b border-evidence-assumption-border/40 bg-evidence-assumption-bg px-4 py-2 text-xs text-evidence-assumption-text"
        >
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Prototyp — alle Recherche- und Marktdaten werden zu
            Demonstrationszwecken von der KI simuliert und sind fiktiv.
          </span>
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
