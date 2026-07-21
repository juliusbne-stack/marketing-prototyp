"use client";

import { useEffect, useState } from "react";
import { FictionalProfile } from "./FictionalProfile";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

export function PrototypeBanner() {
  const [greeting, setGreeting] = useState("Guten Tag");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <p className="shrink-0 font-heading text-sm font-semibold text-text sm:text-[15px]">
          {greeting}, Yannick{" "}
          <span aria-hidden="true">👋</span>
        </p>
        <p
          role="note"
          className="min-w-0 truncate rounded-full bg-background px-2.5 py-1 text-[11px] leading-snug text-text-muted sm:max-w-[min(100%,28rem)] sm:text-xs"
        >
          Prototyp — Markt- und Recherchedaten sind KI-simuliert
        </p>
      </div>

      <div className="shrink-0">
        <FictionalProfile variant="banner" />
      </div>
    </header>
  );
}

/** Compact notice for project pages (no sidebar shell). */
export function PrototypeNoticeStrip() {
  return (
    <div
      role="note"
      className="border-b border-evidence-assumption-border/40 bg-evidence-assumption-bg px-4 py-1.5 text-xs leading-snug text-evidence-assumption-text"
    >
      Prototyp – alle Recherche- und Marktdaten werden zu Demonstrationszwecken
      von der KI simuliert und sind fiktiv.
    </div>
  );
}
