"use client";

import { Bell, ChevronDown } from "lucide-react";
import { usePrototypeNotice } from "./PrototypeNoticeProvider";

export function FictionalProfile({
  variant = "default",
}: {
  variant?: "default" | "banner";
}) {
  const { showNotice } = usePrototypeNotice();
  const isBanner = variant === "banner";

  return (
    <div
      className={
        isBanner
          ? "flex items-center gap-2 sm:gap-2.5"
          : "flex items-center gap-1.5 rounded-full bg-background/90 py-0.5 pl-0.5 pr-1 backdrop-blur-[2px] sm:gap-2.5 sm:pr-1.5"
      }
    >
      <button
        type="button"
        onClick={() => showNotice("Fiktive Profilanzeige im Prototyp")}
        aria-label="Benachrichtigungen – fiktive Anzeige im Prototyp"
        className={
          isBanner
            ? "relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent"
            : "relative rounded-lg p-2 text-text-muted transition-colors hover:bg-accent-soft hover:text-accent"
        }
      >
        <Bell className="h-4 w-4" aria-hidden />
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-surface"
          aria-hidden
        />
      </button>

      <button
        type="button"
        onClick={() => showNotice("Fiktive Profilanzeige im Prototyp")}
        aria-label="Fiktive Profilanzeige im Prototyp"
        className={
          isBanner
            ? "flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-1 transition-colors hover:bg-background sm:pr-1.5"
            : "flex items-center gap-2 rounded-full py-1 pl-1 pr-1.5 transition-colors hover:bg-black/[0.03]"
        }
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white"
          aria-hidden
        >
          CB
        </span>
        <span
          className={
            isBanner
              ? "hidden text-sm font-medium text-text sm:inline"
              : "hidden text-sm font-medium text-text lg:inline"
          }
        >
          Christoph B.
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-text-muted" aria-hidden />
      </button>
    </div>
  );
}
