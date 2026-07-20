"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Pencil } from "lucide-react";
import {
  answerToDisplayText,
  getQuestionsForPhase,
  type PhaseInputPhase,
  type PhaseInputState,
} from "@/lib/phaseInput";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
import { PhaseInputQuestionPanel } from "./PhaseInputQuestionPanel";

export function PhaseInputForm({
  projectId,
  phase,
  initialState,
  previewTitle,
  onSaved,
  onReopenWizard,
  remountKey,
}: {
  projectId: string;
  phase: PhaseInputPhase;
  initialState: PhaseInputState;
  previewTitle: string;
  onSaved?: (state: PhaseInputState) => void;
  onReopenWizard?: (stepIndex?: number) => void;
  /** Changes after save to remount children (F11). */
  remountKey?: string;
}) {
  const router = useRouter();
  const questions = getQuestionsForPhase(phase);
  const [state, setState] = useState<PhaseInputState>(initialState);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const questionIndexByKey = new Map(
    questions.map((question, index) => [question.key, index])
  );

  async function saveState(nextState: PhaseInputState) {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/phase-inputs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phase,
          entries: Object.entries(nextState.answers).map(([questionKey, answer]) => ({
            questionKey,
            value: answer.skipped ? null : answer.value,
            skipped: answer.skipped,
          })),
          onboarding: nextState.onboarding,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error ??
            "Die Eingaben konnten nicht gespeichert werden. Erneut versuchen."
        );
      }
      const saved = (await response.json()) as PhaseInputState;
      setState(saved);
      setSavedAt(Date.now());
      onSaved?.(saved);
      router.refresh();
      return saved;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Eingaben konnten nicht gespeichert werden."
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAnswer(questionKey: string) {
    const saved = await saveState(state);
    if (saved) setEditingKey(null);
  }

  async function handleSkip(questionKey: string) {
    const nextState: PhaseInputState = {
      ...state,
      answers: {
        ...state.answers,
        [questionKey]: { value: null, skipped: true },
      },
    };
    setState(nextState);
    await saveState(nextState);
    setEditingKey(null);
  }

  return (
    <CollapsibleSection
      title={previewTitle}
      intro="Diese Angaben steuern die KI-Generierung. Du kannst sie jederzeit ändern — bei erneuter Generierung gelten die neuen Werte."
      defaultOpen={!state.onboarding.complete}
      actions={
        onReopenWizard ? (
          <button
            type="button"
            onClick={() => onReopenWizard()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-text transition-colors hover:bg-background"
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            Fragebogen erneut öffnen
          </button>
        ) : undefined
      }
    >
      <div key={remountKey ?? savedAt ?? "initial"} className="flex flex-col gap-3">
        {questions.map((question) => {
          const answer = state.answers[question.key];
          const display = answer
            ? answerToDisplayText(question, answer)
            : null;
          const isEditing = editingKey === question.key;

          if (isEditing && answer) {
            return (
              <div
                key={question.key}
                className="rounded-md border border-accent/40 bg-background p-4"
              >
                <PhaseInputQuestionPanel
                  question={question}
                  answer={answer}
                  onChange={(next) =>
                    setState((current) => ({
                      ...current,
                      answers: {
                        ...current.answers,
                        [question.key]: next,
                      },
                    }))
                  }
                  onNext={() => void handleSaveAnswer(question.key)}
                  disabled={isSaving}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {question.skippable && (
                    <button
                      type="button"
                      onClick={() => void handleSkip(question.key)}
                      disabled={isSaving}
                      className="rounded-md px-3 py-1.5 text-xs text-text-muted hover:text-text disabled:opacity-50"
                    >
                      Später klären
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingKey(null)}
                    disabled={isSaving}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-text disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSaveAnswer(question.key)}
                    disabled={isSaving}
                    className="ml-auto btn-primary btn-primary--sm"
                  >
                    {isSaving ? "Speichern …" : "Speichern"}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={question.key}
              className="flex items-start justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-text">{question.label}</p>
                {answer?.skipped ? (
                  <span className="mt-1 inline-flex rounded-full border border-evidence-question-border bg-evidence-question-bg px-2 py-0.5 text-[10px] font-medium text-evidence-question-text">
                    Offen
                  </span>
                ) : display ? (
                  <p className="mt-1 text-sm text-text-muted">{display}</p>
                ) : (
                  <p className="mt-1 text-sm italic text-text-muted">
                    Noch keine Angabe
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => setEditingKey(question.key)}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-50"
                  aria-label={`${question.label} bearbeiten`}
                >
                  <Pencil className="h-3 w-3" aria-hidden />
                  Bearbeiten
                </button>
                {onReopenWizard && (
                  <button
                    type="button"
                    onClick={() =>
                      onReopenWizard(questionIndexByKey.get(question.key) ?? 0)
                    }
                    disabled={isSaving}
                    className="rounded-md px-2 py-1 text-[10px] text-text-muted transition-colors hover:bg-surface hover:text-text disabled:opacity-50"
                  >
                    Im Fragebogen
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {error && <p className="text-xs text-danger-text">{error}</p>}
      </div>
    </CollapsibleSection>
  );
}
