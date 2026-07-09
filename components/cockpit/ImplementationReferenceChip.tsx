"use client";

import { Info } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

/** Reference chip for tasks fulfilled by a prior implementation (StatementReferenceChip pattern). */
export function ImplementationReferenceChip({
  stepTitle,
  prefix = "bereits erfüllt durch:",
}: {
  stepTitle: string;
  prefix?: string;
}) {
  return (
    <Tooltip
      content={
        <span className="block text-[13px] leading-relaxed text-text">
          {stepTitle}
        </span>
      }
    >
      <span
        tabIndex={0}
        className="group/chip inline-flex max-w-full cursor-help items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px] font-medium text-text-muted transition-[background-color,border-color,box-shadow] duration-150 hover:border-border hover:bg-surface hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        <span className="truncate underline decoration-dotted decoration-current/35 underline-offset-[3px] group-hover/chip:decoration-current/70">
          {prefix} {stepTitle}
        </span>
        <Info
          className="h-3 w-3 shrink-0 opacity-45 transition-opacity group-hover/chip:opacity-80 group-focus-visible/chip:opacity-80"
          aria-hidden
        />
      </span>
    </Tooltip>
  );
}
