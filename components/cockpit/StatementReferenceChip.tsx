"use client";

import { Info } from "lucide-react";
import type { EvidenceStatus } from "@prisma/client";
import { Tooltip } from "@/components/ui/Tooltip";

const EVIDENCE_TEXT_CLASS: Record<EvidenceStatus, string> = {
  FACT: "text-evidence-fact-text",
  ASSUMPTION: "text-evidence-assumption-text",
  OPEN_QUESTION: "text-evidence-question-text",
};

const EVIDENCE_CHIP_CLASS: Record<EvidenceStatus, string> = {
  FACT: "border-evidence-fact-border/35 bg-evidence-fact-bg/60 text-evidence-fact-text hover:border-evidence-fact-border/70 hover:bg-evidence-fact-bg hover:shadow-sm",
  ASSUMPTION:
    "border-evidence-assumption-border/35 bg-evidence-assumption-bg/60 text-evidence-assumption-text hover:border-evidence-assumption-border/70 hover:bg-evidence-assumption-bg hover:shadow-sm",
  OPEN_QUESTION:
    "border-evidence-question-border/35 bg-evidence-question-bg/60 text-evidence-question-text hover:border-evidence-question-border/70 hover:bg-evidence-question-bg hover:shadow-sm",
};

const EVIDENCE_DOT_CLASS: Record<EvidenceStatus, string> = {
  FACT: "bg-evidence-fact-border",
  ASSUMPTION: "bg-evidence-assumption-border",
  OPEN_QUESTION: "bg-evidence-question-border",
};

const EVIDENCE_LABEL: Record<EvidenceStatus, string> = {
  FACT: "Fakt",
  ASSUMPTION: "Annahme",
  OPEN_QUESTION: "Offene Frage",
};

export function StatementReferenceChip({
  displayNumber,
  evidenceStatus,
  content,
  prefix = "Prüft:",
}: {
  displayNumber: number;
  evidenceStatus: EvidenceStatus;
  content: string;
  prefix?: string;
}) {
  const label = EVIDENCE_LABEL[evidenceStatus];

  return (
    <Tooltip
      content={
        <span className="block">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${EVIDENCE_TEXT_CLASS[evidenceStatus]}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${EVIDENCE_DOT_CLASS[evidenceStatus]}`}
              aria-hidden
            />
            {label} #{displayNumber}
          </span>
          <span className="mt-1.5 block text-[13px] leading-relaxed text-text">
            {content}
          </span>
        </span>
      }
    >
      <span
        tabIndex={0}
        className={`group/chip inline-flex max-w-full cursor-help items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-[background-color,border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 ${EVIDENCE_CHIP_CLASS[evidenceStatus]}`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${EVIDENCE_DOT_CLASS[evidenceStatus]}`}
          aria-hidden
        />
        <span className="truncate underline decoration-dotted decoration-current/35 underline-offset-[3px] group-hover/chip:decoration-current/70">
          {prefix} {label} #{displayNumber}
        </span>
        <Info
          className="h-3 w-3 shrink-0 opacity-45 transition-opacity group-hover/chip:opacity-80 group-focus-visible/chip:opacity-80"
          aria-hidden
        />
      </span>
    </Tooltip>
  );
}
