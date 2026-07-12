"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { EvidenceStatus } from "@prisma/client";

const EVIDENCE_CONFIG: Record<
  EvidenceStatus,
  { label: string; className: string; dotClassName: string }
> = {
  FACT: {
    label: "Fakt",
    className:
      "bg-evidence-fact-bg text-evidence-fact-text border-evidence-fact-border",
    dotClassName: "bg-evidence-fact-border",
  },
  ASSUMPTION: {
    label: "Annahme",
    className:
      "bg-evidence-assumption-bg text-evidence-assumption-text border-evidence-assumption-border",
    dotClassName: "bg-evidence-assumption-border",
  },
  OPEN_QUESTION: {
    label: "Offene Frage",
    className:
      "bg-evidence-question-bg text-evidence-question-text border-evidence-question-border",
    dotClassName: "bg-evidence-question-border",
  },
};

const ALL_STATUSES: EvidenceStatus[] = ["FACT", "ASSUMPTION", "OPEN_QUESTION"];

export const SIMULATED_FACT_TOOLTIP =
  "Fakt bedeutet hier: innerhalb der simulierten Recherche als belegt dargestellt; keine reale externe Prüfung.";

export function EvidenceBadge({
  status,
  onChange,
  disabled = false,
  factTooltip,
}: {
  status: EvidenceStatus;
  /** Klick auf das Badge öffnet ein Dropdown zum Umstufen (F5/NF2). */
  onChange?: (status: EvidenceStatus) => void;
  disabled?: boolean;
  /** Tooltip nur bei status FACT (z. B. Wettbewerbsbereich). */
  factTooltip?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const config = EVIDENCE_CONFIG[status];
  const interactive = Boolean(onChange) && !disabled;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const pill = (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
      title={status === "FACT" && factTooltip ? factTooltip : undefined}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dotClassName}`}
        aria-hidden
      />
      {config.label}
      {interactive && <ChevronDown className="h-3 w-3" aria-hidden />}
    </span>
  );

  if (!interactive) {
    return pill;
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Evidenzstatus ändern, aktuell: ${config.label}`}
        title={status === "FACT" && factTooltip ? factTooltip : undefined}
        className="inline-flex cursor-pointer rounded-full"
      >
        {pill}
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 w-44 rounded-md border border-border bg-surface py-1 shadow-sm"
        >
          {ALL_STATUSES.map((option) => {
            const optionConfig = EVIDENCE_CONFIG[option];
            return (
              <li key={option} role="option" aria-selected={option === status}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (option !== status) onChange?.(option);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent-soft ${
                    option === status ? "font-semibold" : ""
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${optionConfig.dotClassName}`}
                    aria-hidden
                  />
                  {optionConfig.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
