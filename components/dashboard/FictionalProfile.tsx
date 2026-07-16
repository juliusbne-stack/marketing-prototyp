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
          ? "flex items-center gap-1 sm:gap-1.5"
          : "flex items-center gap-1.5 rounded-full bg-background/90 py-0.5 pl-0.5 pr-1 backdrop-blur-[2px] sm:gap-2.5 sm:pr-1.5"
      }
    >
      <button
        type="button"
        onClick={() => showNotice("Fiktive Profilanzeige im Prototyp")}
        aria-label="Benachrichtigungen – fiktive Anzeige im Prototyp"
        className={
          isBanner
            ? "rounded-md p-1.5 text-evidence-assumption-text/80 transition-colors hover:bg-black/[0.04] hover:text-evidence-assumption-text"
            : "rounded-lg p-2 text-text-muted transition-colors hover:bg-accent-soft hover:text-accent"
        }
      >
        <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => showNotice("Fiktive Profilanzeige im Prototyp")}
        aria-label="Fiktive Profilanzeige im Prototyp"
        className={
          isBanner
            ? "flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-1 transition-colors hover:bg-black/[0.04] sm:gap-2 sm:pr-1.5"
            : "flex items-center gap-2 rounded-full py-1 pl-1 pr-1.5 transition-colors hover:bg-black/[0.03]"
        }
      >
        <span
          className={
            isBanner
              ? "flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[10px] font-semibold text-sky-800 sm:h-7 sm:w-7 sm:text-xs"
              : "flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-800"
          }
          aria-hidden
        >
          AC
        </span>
        <span
          className={
            isBanner
              ? "hidden text-xs font-medium text-evidence-assumption-text sm:inline"
              : "hidden text-sm font-medium text-text lg:inline"
          }
        >
          Anna C.
        </span>
        <ChevronDown
          className={
            isBanner
              ? "h-3 w-3 text-evidence-assumption-text/70"
              : "h-3.5 w-3.5 text-text-muted"
          }
          aria-hidden
        />
      </button>
    </div>
  );
}
