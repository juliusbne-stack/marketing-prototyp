"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  defaultAnswerForQuestion,
  buildWizardSaveEntries,
  getQuestionsForPhase,
  getResumeStep,
  isOnboardingNeeded,
  type PhaseInputPhase,
  type PhaseInputState,
} from "@/lib/phaseInput";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
import { PhaseInputPreview } from "./PhaseInputPreview";
import { PhaseInputProgress } from "./PhaseInputProgress";
import { PhaseInputQuestionPanel } from "./PhaseInputQuestionPanel";

export function PhaseInputWizard({
  projectId,
  phase,
  initialState,
  previewTitle,
  mode = "initial",
  initialStepIndex,
  onComplete,
}: {
  projectId: string;
  phase: PhaseInputPhase;
  initialState: PhaseInputState;
  previewTitle: string;
  /** `edit` = Fragebogen nach Abschluss erneut öffnen. */
  mode?: "initial" | "edit";
  initialStepIndex?: number;
  onComplete: (state: PhaseInputState) => void;
}) {
  const questions = getQuestionsForPhase(phase);
  const resumeStep = getResumeStep(initialState);
  const startStep =
    initialStepIndex ??
    (mode === "edit" ? 0 : Math.min(resumeStep, questions.length - 1));
  const [stepIndex, setStepIndex] = useState(startStep);
  const [phase_ui, setPhaseUi] = useState<"question" | "finishing">("question");
  const [state, setState] = useState<PhaseInputState>(initialState);
  const [skippedKeys, setSkippedKeys] = useState<Set<string>>(() => {
    const skipped = new Set<string>();
    for (const [key, answer] of Object.entries(initialState.answers)) {
      if (answer.skipped) skipped.add(key);
    }
    return skipped;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const currentQuestion = questions[stepIndex];
  const currentAnswer =
    state.answers[currentQuestion.key] ??
    defaultAnswerForQuestion(currentQuestion);

  async function saveProgress(nextState: PhaseInputState) {
    setIsSaving(true);
    setError(null);
    const entries =
      mode === "edit"
        ? Object.entries(nextState.answers).map(([questionKey, answer]) => ({
            questionKey,
            value: answer.skipped ? null : answer.value,
            skipped: answer.skipped,
          }))
        : buildWizardSaveEntries(phase, nextState);
    try {
      const response = await fetch("/api/phase-inputs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phase,
          entries,
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
      return (await response.json()) as PhaseInputState;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Eingaben konnten nicht gespeichert werden. Erneut versuchen."
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  const finishWizard = useCallback(
    async (nextState: PhaseInputState, options?: { showFinishingUi?: boolean }) => {
      const showFinishingUi = options?.showFinishingUi ?? mode === "initial";
      if (showFinishingUi) {
        setFinishing(true);
        setPhaseUi("finishing");
      }
      const completed: PhaseInputState = {
        ...nextState,
        onboarding: { stepIndex: questions.length - 1, complete: true },
      };
      const saved = await saveProgress(completed);
      if (saved) {
        if (showFinishingUi) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        onComplete(saved);
      } else {
        setFinishing(false);
        setPhaseUi("question");
      }
    },
    [mode, onComplete, questions.length]
  );

  async function returnToOverview() {
    if (isSaving || finishing) return;
    const completed: PhaseInputState = {
      ...state,
      onboarding: { stepIndex: stepIndex, complete: true },
    };
    const saved = await saveProgress(completed);
    if (saved) {
      onComplete(saved);
    }
  }

  async function advanceFromStep(skipped = false) {
    const nextAnswers = { ...state.answers };
    if (skipped) {
      setSkippedKeys((current) => new Set([...current, currentQuestion.key]));
      nextAnswers[currentQuestion.key] = {
        value: null,
        skipped: true,
      };
    } else {
      nextAnswers[currentQuestion.key] = {
        ...currentAnswer,
        skipped: false,
      };
    }

    const isLast = stepIndex >= questions.length - 1;
    const nextState: PhaseInputState = {
      answers: nextAnswers,
      onboarding: {
        stepIndex: isLast ? stepIndex : stepIndex + 1,
        complete: false,
      },
    };
    setState(nextState);

    if (isLast) {
      await finishWizard(nextState, {
        showFinishingUi: mode === "initial",
      });
      return;
    }

    const saved = await saveProgress(nextState);
    if (!saved) return;
    setState(saved);
    setStepIndex(stepIndex + 1);
  }

  async function handleNext() {
    if (isSaving) return;
    await advanceFromStep(false);
  }

  async function handleSkip() {
    if (!currentQuestion.skippable || isSaving) return;
    await advanceFromStep(true);
  }

  function handleBack() {
    if (stepIndex <= 0 || isSaving) return;
    setStepIndex((current) => current - 1);
  }

  function handleJumpToStep(index: number) {
    if (isSaving || finishing || index < 0 || index >= questions.length) return;
    setStepIndex(index);
  }

  function handleAnswerChange(answer: typeof currentAnswer) {
    setState((current) => ({
      ...current,
      answers: { ...current.answers, [currentQuestion.key]: answer },
    }));
  }

  const busy = isSaving || finishing;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PhaseInputProgress
          stepIndex={stepIndex}
          totalSteps={questions.length}
          title={previewTitle}
        />
        {mode === "edit" && (
          <button
            type="button"
            onClick={() => void returnToOverview()}
            disabled={busy}
            className="shrink-0 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-background hover:text-text disabled:opacity-50"
          >
            Zur Übersicht zurück
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-3">
          <div className="rounded-[10px] border border-border bg-surface p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {phase_ui === "finishing" && (
                <motion.div
                  key="finish"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex min-h-[200px] flex-col items-center justify-center gap-3 px-4 py-12 text-center"
                >
                  <p className="font-heading text-lg font-medium text-text">
                    Deine Angaben sind gespeichert.
                  </p>
                  <p className="max-w-md text-sm text-text-muted">
                    Du kannst sie jederzeit anpassen, bevor du die Generierung
                    startest.
                  </p>
                </motion.div>
              )}
              {phase_ui === "question" && (
                <PhaseInputQuestionPanel
                  key={currentQuestion.key}
                  question={currentQuestion}
                  answer={currentAnswer}
                  onChange={handleAnswerChange}
                  onNext={handleNext}
                  disabled={busy}
                />
              )}
            </AnimatePresence>

            {phase_ui === "question" && (
              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={stepIndex === 0 || busy}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text transition-colors hover:bg-background disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Zurück
                </button>
                {currentQuestion.skippable && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={busy}
                    className="rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:text-text disabled:opacity-50"
                  >
                    Später klären
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={busy}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-bright active:bg-brand-dark disabled:opacity-50"
                >
                  {busy ? "Wird gespeichert …" : "Weiter"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            )}

            {error && <p className="mt-3 text-xs text-danger-text">{error}</p>}
          </div>
        </div>

        <div className="hidden lg:col-span-2 lg:block">
          <div className="sticky top-6">
            <PhaseInputPreview
              phase={phase}
              stepIndex={stepIndex}
              answers={state.answers}
              skippedKeys={skippedKeys}
              title={previewTitle}
              interactive={mode === "edit"}
              onStepSelect={handleJumpToStep}
            />
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <CollapsibleSection
          title={`Vorschau (${stepIndex + 1}/${questions.length})`}
          defaultOpen={false}
        >
          <PhaseInputPreview
            phase={phase}
            stepIndex={stepIndex}
            answers={state.answers}
            skippedKeys={skippedKeys}
            title={previewTitle}
            interactive={mode === "edit"}
            onStepSelect={handleJumpToStep}
          />
        </CollapsibleSection>
      </div>
    </div>
  );
}

export function needsPhaseInputWizard(state: PhaseInputState): boolean {
  return isOnboardingNeeded(state);
}
