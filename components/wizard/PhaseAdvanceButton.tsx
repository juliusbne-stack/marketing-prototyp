"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";
import { PHASES } from "./PhaseStepper";

// Footer navigation at the bottom of each phase view. Advancing persists the
// unlock (project.currentPhase) and then navigates to the next phase.
export function PhaseAdvanceButton({
  projectId,
  nextPhase,
  enabled,
  disabledHint,
  enabledHint,
}: {
  projectId: string;
  nextPhase: 2 | 3 | 4 | 5;
  enabled: boolean;
  disabledHint?: string;
  enabledHint?: string;
}) {
  const router = useRouter();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextTitle = PHASES.find((phase) => phase.number === nextPhase)?.title;

  async function handleAdvance() {
    setIsAdvancing(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/phase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: nextPhase }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "Der Phasenwechsel konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      router.push(`/project/${projectId}/phase/${nextPhase}`);
      // Refresh so the stepper picks up the new currentPhase from the server.
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Phasenwechsel konnte nicht gespeichert werden. Erneut versuchen."
      );
      setIsAdvancing(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
      {error && <p className="text-sm text-danger-text">{error}</p>}
      {enabled && enabledHint && (
        <p className="mr-auto text-sm text-text-muted">{enabledHint}</p>
      )}
      {!enabled && disabledHint && (
        <p className="text-sm text-text-muted">{disabledHint}</p>
      )}
      <ProgressButton
        type="button"
        onClick={handleAdvance}
        loading={isAdvancing}
        loadingPhase="save"
        disabled={!enabled}
        loadingLabel="Wechsel läuft …"
      >
        {`Weiter zu Phase ${nextPhase}: ${nextTitle}`}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </ProgressButton>
    </div>
  );
}
