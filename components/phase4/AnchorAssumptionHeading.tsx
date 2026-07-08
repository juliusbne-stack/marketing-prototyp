import type { EvidenceStatus } from "@prisma/client";
import {
  getAnchorAssumptionGroupHeading,
  getAnchorAssumptionGroupSubtitle,
} from "@/lib/anchorAssumptionLabel";

export function AnchorAssumptionHeading({
  evidenceStatus,
}: {
  evidenceStatus: EvidenceStatus;
}) {
  const subtitle = getAnchorAssumptionGroupSubtitle(evidenceStatus);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {getAnchorAssumptionGroupHeading(evidenceStatus)}
      </p>
      {subtitle && (
        <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
      )}
    </div>
  );
}
