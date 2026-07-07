"use client";

import { PhaseAdvanceButton } from "@/components/wizard/PhaseAdvanceButton";

// Unlocks phase 5 after the implementation period in the cockpit.
export function CockpitFooter({
  projectId,
  hasAdoptedSteps,
  periodComplete = false,
}: {
  projectId: string;
  hasAdoptedSteps: boolean;
  periodComplete?: boolean;
}) {
  return (
    <PhaseAdvanceButton
      projectId={projectId}
      nextPhase={5}
      enabled={hasAdoptedSteps}
      disabledHint="Übernimm zuerst in Phase 4 mindestens einen Umsetzungsschritt in den Projektstand."
      enabledHint={
        periodComplete
          ? "Alle Rückmeldungen liegen vor — werte sie jetzt in Phase 5 aus."
          : "Wenn die Umsetzung vorbereitet ist, gehe zu Phase 5 für Rückmeldungen und Auswertung."
      }
    />
  );
}
