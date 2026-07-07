"use client";

import type { EvidenceStatus } from "@prisma/client";

const EVIDENCE_CHIP_CLASS: Record<EvidenceStatus, string> = {
  FACT: "border-evidence-fact-border/35 bg-evidence-fact-bg/60 text-evidence-fact-text",
  ASSUMPTION:
    "border-evidence-assumption-border/35 bg-evidence-assumption-bg/60 text-evidence-assumption-text",
  OPEN_QUESTION:
    "border-evidence-question-border/35 bg-evidence-question-bg/60 text-evidence-question-text",
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
  const tooltip = `${EVIDENCE_LABEL[evidenceStatus]} #${displayNumber}: ${content}`;

  return (
    <span
      title={tooltip}
      className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${EVIDENCE_CHIP_CLASS[evidenceStatus]}`}
    >
      <span className="truncate">
        {prefix} {EVIDENCE_LABEL[evidenceStatus]} #{displayNumber}
      </span>
    </span>
  );
}
