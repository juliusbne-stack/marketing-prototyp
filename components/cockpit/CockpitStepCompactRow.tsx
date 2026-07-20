"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Radio } from "lucide-react";
import { CockpitStepCard } from "./CockpitStepCard";
import { StepReadinessChip } from "./StepReadinessChip";
import {
  deriveStepReadiness,
  type StepReadiness,
} from "@/lib/cockpitPeriod";
import {
  getStepKpiIndicator,
  KPI_ASSESSMENT_CONFIG,
  type CockpitStepData,
} from "./types";
import { taskProgress } from "@/lib/cockpitRecommendation";
import { RESULT_CONFIG } from "@/components/phase5/types";

// Compact row for secondary active or completed steps — expands to full/read-only card.
export function CockpitStepCompactRow({
  projectId,
  step,
  readOnly = false,
}: {
  projectId: string;
  step: CockpitStepData;
  readOnly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const progress = taskProgress(step);
  const kpiIndicator = getStepKpiIndicator(step);
  const readiness: StepReadiness | null = readOnly
    ? null
    : deriveStepReadiness(step.tasks, step.metrics, step.hasFeedback);

  const statusContent =
    readOnly && step.feedbackEvaluated && step.feedbackResult ? (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RESULT_CONFIG[step.feedbackResult].className}`}
      >
        {RESULT_CONFIG[step.feedbackResult].label}
      </span>
    ) : readOnly ? (
      <span className="text-xs text-text-muted">
        Rückmeldung erfasst —{" "}
        <Link
          href={`/project/${projectId}/phase/5`}
          className="font-medium text-accent hover:underline"
        >
          in Phase 5 auswerten
        </Link>
      </span>
    ) : null;

  return (
    <div className="rounded-[10px] border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-background sm:flex-row sm:items-center"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${
              expanded ? "rotate-90" : ""
            }`}
            aria-hidden
          />
          <span className="min-w-0 font-heading text-sm font-medium text-text">
            {step.title}
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-2 pl-6 sm:pl-0">
          {step.channel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-deep">
              <Radio className="h-3 w-3" aria-hidden />
              {step.channel}
            </span>
          )}
          {!readOnly && readiness && <StepReadinessChip readiness={readiness} />}
          {!readOnly && (
            <span className="text-xs text-text-muted">
              {progress.total > 0 ? `${progress.done}/${progress.total}` : "—"}
            </span>
          )}
          {statusContent}
          <span
            title={
              kpiIndicator
                ? KPI_ASSESSMENT_CONFIG[kpiIndicator].label
                : "Noch keine Kennzahlen"
            }
            className={`h-2 w-2 shrink-0 rounded-full ${
              kpiIndicator
                ? KPI_ASSESSMENT_CONFIG[kpiIndicator].dotClassName
                : "bg-text-muted/30"
            }`}
            aria-label={
              kpiIndicator
                ? `Letztes KPI-Assessment: ${KPI_ASSESSMENT_CONFIG[kpiIndicator].label}`
                : "Noch keine Kennzahlen"
            }
          />
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border/70 px-4 pb-4 pt-3">
          <CockpitStepCard
            key={step.id}
            projectId={projectId}
            step={step}
            readOnly={readOnly}
            embedded
          />
        </div>
      )}
    </div>
  );
}
