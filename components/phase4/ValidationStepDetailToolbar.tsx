"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

export function ValidationStepDetailToolbar({
  projectId,
}: {
  projectId: string;
}) {
  return (
    <div className="validation-step-detail-toolbar mb-4 flex flex-wrap items-center justify-between gap-3">
      <Link
        href={`/project/${projectId}/phase/4`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Zurück zu Phase 4
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-text transition-colors hover:border-accent hover:text-accent"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden />
          Drucken
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Ansicht schließen
        </button>
      </div>
    </div>
  );
}
