"use client";

import { STRATEGY_DIMENSION_LABEL } from "@/lib/labels/phase4";
import type { StrategyDimension } from "@prisma/client";

export function StrategyDimensionChip({
  dimension,
}: {
  dimension: StrategyDimension;
}) {
  const label = STRATEGY_DIMENSION_LABEL[dimension];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-deep">
      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
      Dimension: {label}
    </span>
  );
}
