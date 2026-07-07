import Link from "next/link";
import type { StatementData } from "@/components/statements/types";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import { RESULT_CONFIG, type FeedbackData } from "@/components/phase5/types";

export function CompletedAssumptionCard({
  projectId,
  assumption,
  feedback,
  anchorStepId,
}: {
  projectId: string;
  assumption: StatementData;
  feedback: FeedbackData;
  anchorStepId: string;
}) {
  const resultConfig = RESULT_CONFIG[feedback.result];

  return (
    <div className="rounded-[10px] border border-border/80 bg-background px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <EvidenceBadge status={assumption.evidenceStatus} />
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${resultConfig.className}`}
        >
          {resultConfig.label}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-text">{assumption.content}</p>
      <Link
        href={`/project/${projectId}/phase/5#step-feedback-${anchorStepId}`}
        className="mt-2 inline-block text-xs font-medium text-accent hover:underline"
      >
        In Phase 5 ansehen
      </Link>
    </div>
  );
}
