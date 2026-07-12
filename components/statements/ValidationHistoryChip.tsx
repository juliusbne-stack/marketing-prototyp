import type { FeedbackResult } from "@prisma/client";
import {
  getValidationHistorySegments,
  type ValidationHistoryCounts,
} from "@/lib/validation";

const SEGMENT_TEXT_CLASS: Record<FeedbackResult, string> = {
  SUPPORTED: "text-evidence-fact-text",
  PARTIALLY_SUPPORTED: "text-evidence-assumption-text",
  REFUTED: "text-danger-text",
  AMBIGUOUS: "text-evidence-question-text",
};

const SINGLE_CHIP_CLASS: Record<FeedbackResult, string> = {
  SUPPORTED:
    "border-evidence-fact-border/35 bg-evidence-fact-bg/60 text-evidence-fact-text",
  PARTIALLY_SUPPORTED:
    "border-evidence-assumption-border/35 bg-evidence-assumption-bg/60 text-evidence-assumption-text",
  REFUTED: "border-danger-text/25 bg-danger-bg/60 text-danger-text",
  AMBIGUOUS:
    "border-evidence-question-border/35 bg-evidence-question-bg/60 text-evidence-question-text",
};

export function ValidationHistoryChip({
  counts,
}: {
  counts: ValidationHistoryCounts;
}) {
  const segments = getValidationHistorySegments(counts);
  if (segments.length === 0) return null;

  const tooltip = "Prüfhistorie über alle Validierungsdurchläufe";

  if (segments.length === 1) {
    const { result, label } = segments[0];
    return (
      <span
        title={tooltip}
        className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${SINGLE_CHIP_CLASS[result]}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      title={tooltip}
      className="inline-flex items-center whitespace-nowrap rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium"
    >
      {segments.map((segment, index) => (
        <span key={segment.result}>
          {index > 0 && (
            <span className="mx-1 text-text-muted" aria-hidden>
              ·
            </span>
          )}
          <span className={SEGMENT_TEXT_CLASS[segment.result]}>{segment.label}</span>
        </span>
      ))}
    </span>
  );
}
