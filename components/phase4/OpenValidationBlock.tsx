"use client";

import { useState } from "react";
import { MessageCircle, Trash2, XCircle } from "lucide-react";
import type { AdoptedAussageInput } from "@/lib/phase4/strategyAssistant";
import type { ValidationHistoryCounts } from "@/lib/validation";
import type { StatementData } from "@/components/statements/types";
import { useConfirm } from "@/components/ui/DialogProvider";
import { StatementCard } from "@/components/statements/StatementCard";
import { AnchorAssumptionHeading } from "./AnchorAssumptionHeading";
import { StrategieAssistentPanel } from "./StrategieAssistentPanel";
import { ValidationStepCard } from "./ValidationStepCard";
import type { AssistantTaskData, StepWithAssumption } from "./types";

const DRAFT_DELETE_CONFIRM =
  "Diesen Validierungsentwurf löschen? Übernommene Inhalte bleiben davon unberührt.";

const ADOPTED_DISCARD_CONFIRM =
  "Diese Validierung wurde bereits übernommen. Sie wird nicht endgültig gelöscht, sondern als nicht weiter verfolgt markiert, damit spätere Aufgaben, Kennzahlen oder Rückmeldungen nachvollziehbar bleiben.";

// One open validation block: critical assumption + implementation step(s)
// with visible actions for the strategy assistant, delete and discard.
export function OpenValidationBlock({
  projectId,
  assumption,
  steps,
  validationHistory,
  onAssumptionChanged,
  onStepChanged,
  onStepRemoved,
  onTaskChanged,
  onRefinementAdopted,
  adoptedAussagen,
}: {
  projectId: string;
  assumption: StatementData;
  steps: StepWithAssumption[];
  validationHistory?: ValidationHistoryCounts | null;
  adoptedAussagen: AdoptedAussageInput[];
  onAssumptionChanged: (statement: StatementData) => void;
  onStepChanged: (step: StepWithAssumption) => void;
  onStepRemoved: (stepId: string) => void;
  onTaskChanged: (stepId: string, task: AssistantTaskData) => void;
  onRefinementAdopted: (result: {
    step: StepWithAssumption;
    assumption: StatementData;
    archivedStepId: string | null;
  }) => void;
}) {
  const confirm = useConfirm();
  const primaryStep = steps[0];
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!primaryStep) return null;

  async function handleDeleteDraft() {
    const confirmed = await confirm({
      title: "Validierungsentwurf löschen?",
      message: DRAFT_DELETE_CONFIRM,
      confirmLabel: "Löschen",
      cancelLabel: "Abbrechen",
      variant: "danger",
    });
    if (!confirmed) return;

    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/steps?id=${encodeURIComponent(primaryStep.id)}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "Der Validierungsentwurf konnte nicht gelöscht werden. Erneut versuchen."
        );
      }
      onStepRemoved(primaryStep.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Validierungsentwurf konnte nicht gelöscht werden. Erneut versuchen."
      );
      setIsBusy(false);
    }
  }

  async function handleDiscardAdopted() {
    const confirmed = await confirm({
      title: "Validierung nicht weiter verfolgen?",
      message: ADOPTED_DISCARD_CONFIRM,
      confirmLabel: "Nicht weiter verfolgen",
      cancelLabel: "Abbrechen",
    });
    if (!confirmed) return;

    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/steps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: primaryStep.id, discard: true }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "Die Validierung konnte nicht verworfen werden. Erneut versuchen."
        );
      }
      onStepRemoved(primaryStep.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Validierung konnte nicht verworfen werden. Erneut versuchen."
      );
      setIsBusy(false);
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${isBusy ? "opacity-60" : ""}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <AnchorAssumptionHeading evidenceStatus={assumption.evidenceStatus} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAssistantOpen((open) => !open)}
            disabled={isBusy}
            aria-expanded={assistantOpen}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              assistantOpen
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-text-muted hover:border-accent hover:text-accent"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            Strategie Assistent
          </button>
          {!primaryStep.adopted ? (
            <button
              type="button"
              onClick={() => void handleDeleteDraft()}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-md border border-danger-text/30 px-3 py-1.5 text-xs font-medium text-danger-text transition-colors hover:bg-danger-bg disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Löschen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleDiscardAdopted()}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-background disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden />
              Nicht weiter verfolgen
            </button>
          )}
        </div>
      </div>

      <StatementCard
        statement={assumption}
        onChanged={onAssumptionChanged}
        validationHistory={validationHistory}
        showAdoptAction={false}
      />

      <div className="flex flex-col gap-3 border-l-2 border-accent/30 pl-4 md:ml-4">
        {steps.map((step) => (
          <ValidationStepCard
            key={step.id}
            step={step}
            onChanged={(updated) =>
              onStepChanged({ ...updated, assumption: step.assumption })
            }
          />
        ))}
      </div>

      {assistantOpen && (
        <StrategieAssistentPanel
          projectId={projectId}
          assumption={assumption}
          step={primaryStep}
          tasks={primaryStep.assistantTasks ?? []}
          adoptedAussagen={adoptedAussagen}
          onAssumptionChanged={onAssumptionChanged}
          onTaskChanged={(task) => onTaskChanged(primaryStep.id, task)}
          onStepChanged={(updated) =>
            onStepChanged({ ...updated, assumption: primaryStep.assumption })
          }
          onRefinementAdopted={(result) => {
            onRefinementAdopted({
              step: { ...result.step, assumption: result.assumption },
              assumption: result.assumption,
              archivedStepId: result.archivedStepId,
            });
          }}
          onClose={() => setAssistantOpen(false)}
        />
      )}

      {error && (
        <p role="alert" className="text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
