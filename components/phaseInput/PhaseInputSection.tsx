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
  const [wizardMode, setWizardMode] = useState<"initial" | "edit">("initial");
  const [wizardStartStep, setWizardStartStep] = useState(0);
  const [remountKey, setRemountKey] = useState("initial");

  function handleComplete(updated: PhaseInputState) {
    setState(updated);
    setShowWizard(false);
    setWizardMode("initial");
    setRemountKey(String(Date.now()));
    onInputsChange?.(updated);
  }

  function handleSaved(updated: PhaseInputState) {
    setState(updated);
    setRemountKey(String(Date.now()));
    onInputsChange?.(updated);
  }

  function handleReopenWizard(stepIndex = 0) {
    setWizardStartStep(stepIndex);
    setWizardMode("edit");
    setShowWizard(true);
  }

  const previewTitle = PREVIEW_TITLES[phase];

  if (showWizard) {
    return (
      <PhaseInputWizard
        projectId={projectId}
        phase={phase}
        initialState={state}
        previewTitle={previewTitle}
        mode={wizardMode}
        initialStepIndex={wizardMode === "edit" ? wizardStartStep : undefined}
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
      onReopenWizard={handleReopenWizard}
      remountKey={remountKey}
    />
  );
}
