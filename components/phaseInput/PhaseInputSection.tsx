"use client";

import { useState } from "react";
import {
  defaultPhaseInputState,
  type PhaseInputPhase,
  type PhaseInputState,
} from "@/lib/phaseInput";
import { PhaseInputForm } from "./PhaseInputForm";
import { needsPhaseInputWizard, PhaseInputWizard } from "./PhaseInputWizard";

const PREVIEW_TITLES: Record<PhaseInputPhase, string> = {
  2: "Rahmenbedingungen für Strategieoptionen",
  4: "Rahmenbedingungen für die Validierung",
};

export function PhaseInputSection({
  projectId,
  phase,
  initialState,
  onInputsChange,
}: {
  projectId: string;
  phase: PhaseInputPhase;
  initialState?: PhaseInputState;
  onInputsChange?: (state: PhaseInputState) => void;
}) {
  const [state, setState] = useState<PhaseInputState>(
    initialState ?? defaultPhaseInputState(phase)
  );
  const [showWizard, setShowWizard] = useState(
    () => needsPhaseInputWizard(initialState ?? defaultPhaseInputState(phase))
  );
  const [remountKey, setRemountKey] = useState("initial");

  function handleComplete(updated: PhaseInputState) {
    setState(updated);
    setShowWizard(false);
    setRemountKey(String(Date.now()));
    onInputsChange?.(updated);
  }

  function handleSaved(updated: PhaseInputState) {
    setState(updated);
    setRemountKey(String(Date.now()));
    onInputsChange?.(updated);
  }

  const previewTitle = PREVIEW_TITLES[phase];

  if (showWizard) {
    return (
      <PhaseInputWizard
        projectId={projectId}
        phase={phase}
        initialState={state}
        previewTitle={previewTitle}
        onComplete={handleComplete}
      />
    );
  }

  return (
    <PhaseInputForm
      projectId={projectId}
      phase={phase}
      initialState={state}
      previewTitle={previewTitle}
      onSaved={handleSaved}
      remountKey={remountKey}
    />
  );
}
