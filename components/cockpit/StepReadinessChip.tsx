import {
  STEP_READINESS_CONFIG,
  type StepReadiness,
} from "@/lib/cockpitPeriod";

export function StepReadinessChip({
  readiness,
}: {
  readiness: StepReadiness;
}) {
  const config = STEP_READINESS_CONFIG[readiness];

  return (
    <span
      title={config.tooltip}
      className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
