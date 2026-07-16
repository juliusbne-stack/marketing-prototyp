"use client";

import { TriangleAlert } from "lucide-react";
import { FictionalProfile } from "./FictionalProfile";

export function PrototypeBanner() {
  return (
    <div
      role="note"
      className="flex items-center justify-between gap-3 border-b border-evidence-assumption-border/40 bg-evidence-assumption-bg px-4 py-1.5 text-xs leading-snug text-evidence-assumption-text"
    >
      <div className="flex min-w-0 items-center gap-2">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="min-w-0">
          Prototyp – alle Recherche- und Marktdaten werden zu
          Demonstrationszwecken von der KI simuliert und sind fiktiv.
        </span>
      </div>
      <div className="shrink-0">
        <FictionalProfile variant="banner" />
      </div>
    </div>
  );
}
