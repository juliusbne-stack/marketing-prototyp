import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";

// Phase 4 footer: guides into the implementation period without unlocking phase 5.
export function CockpitNavigateButton({
  projectId,
  enabled,
  disabledHint,
}: {
  projectId: string;
  enabled: boolean;
  disabledHint?: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
      {enabled ? (
        <p className="mr-auto text-sm text-text-muted">
          Nächster Schritt: übernommene Schritte im Umsetzungs-Cockpit umsetzen.
        </p>
      ) : (
        disabledHint && <p className="text-sm text-text-muted">{disabledHint}</p>
      )}
      {enabled ? (
        <Link
          href={`/project/${projectId}/cockpit`}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <Gauge className="h-4 w-4" aria-hidden />
          Zum Umsetzungs-Cockpit
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-accent/50 px-4 py-2 text-sm font-medium text-white"
        >
          <Gauge className="h-4 w-4" aria-hidden />
          Zum Umsetzungs-Cockpit
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      )}
    </div>
  );
}
