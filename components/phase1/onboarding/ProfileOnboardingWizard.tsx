"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  CHAPTER_END_STEPS,
  CHAPTER_INTROS,
  formValuesToPatchBody,
  getResumeStep,
  isFirstQuestionInChapter,
  PROFILE_QUESTIONS,
  projectToFormValues,
  type ProfileData,
  type ProfileFieldKey,
} from "@/lib/profileQuestions";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
import { OnboardingProgress } from "./OnboardingProgress";
import { OnboardingResumeBanner } from "./OnboardingResumeBanner";
import { OnboardingQuestionPanel } from "./OnboardingQuestionPanel";
import { OnboardingPreview } from "./OnboardingPreview";
import { OnboardingChapterComplete } from "./OnboardingChapterComplete";

type WizardPhase = "question" | "chapterComplete" | "finishing";

export function ProfileOnboardingWizard({
  project,
  onComplete,
}: {
  project: ProfileData;
  onComplete: (updated: ProfileData) => void;
}) {
  const resumeStep = getResumeStep(project);
  const [stepIndex, setStepIndex] = useState(resumeStep);
  const [phase, setPhase] = useState<WizardPhase>("question");
  const [values, setValues] = useState(() => projectToFormValues(project));
  const [skippedFields, setSkippedFields] = useState<Set<ProfileFieldKey>>(
    () => new Set()
  );
  const [showResumeBanner, setShowResumeBanner] = useState(resumeStep > 0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const currentQuestion = PROFILE_QUESTIONS[stepIndex];
  const currentValue = values[currentQuestion.field];
  const canProceed =
    !currentQuestion.required || Boolean(currentValue.trim());

  async function saveProgress(
    nextValues: Record<ProfileFieldKey, string>,
    nextStep: number,
    complete = false
  ) {
    setIsSaving(true);
    setError(null);
    try {
      const body = formValuesToPatchBody(project.id, nextValues, {
        profileOnboardingStep: complete ? 12 : nextStep,
        profileOnboardingComplete: complete,
      });
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error ??
            "Das Profil konnte nicht gespeichert werden. Erneut versuchen — deine Eingaben bleiben erhalten."
        );
      }
      const updated: ProfileData = await response.json();
      return updated;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das Profil konnte nicht gespeichert werden. Erneut versuchen — deine Eingaben bleiben erhalten."
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  const finishOnboarding = useCallback(
    async (nextValues: Record<ProfileFieldKey, string>) => {
      setFinishing(true);
      setPhase("finishing");
      const updated = await saveProgress(nextValues, 12, true);
      if (updated) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        onComplete(updated);
      } else {
        setFinishing(false);
        setPhase("question");
      }
    },
    [onComplete, project.id]
  );

  async function advanceFromStep(
    nextValues: Record<ProfileFieldKey, string>,
    skipped = false
  ) {
    if (skipped) {
      setSkippedFields((current) => new Set([...current, currentQuestion.field]));
      nextValues = { ...nextValues, [currentQuestion.field]: "" };
      setValues(nextValues);
    }

    const isLast = stepIndex >= PROFILE_QUESTIONS.length - 1;
    if (isLast) {
      await finishOnboarding(nextValues);
      return;
    }

    const nextStep = stepIndex + 1;
    const saved = await saveProgress(nextValues, nextStep);
    if (!saved) return;

    if (CHAPTER_END_STEPS.includes(stepIndex as (typeof CHAPTER_END_STEPS)[number])) {
      setPhase("chapterComplete");
    } else {
      setStepIndex(nextStep);
    }
  }

  async function handleNext() {
    if (!canProceed || isSaving) return;
    await advanceFromStep(values);
  }

  async function handleSkip() {
    if (currentQuestion.required || isSaving) return;
    await advanceFromStep(values, true);
  }

  function handleBack() {
    if (stepIndex <= 0 || isSaving) return;
    if (phase === "chapterComplete") {
      setPhase("question");
      return;
    }
    setStepIndex((current) => current - 1);
    setPhase("question");
  }

  function handleChapterContinue() {
    setPhase("question");
    setStepIndex((current) => current + 1);
  }

  function handleFieldChange(value: string) {
    setValues((current) => ({ ...current, [currentQuestion.field]: value }));
  }

  const busy = isSaving || finishing;
  const chapterIntro = isFirstQuestionInChapter(stepIndex)
    ? CHAPTER_INTROS[currentQuestion.chapter]
    : undefined;
  const previewProps = {
    stepIndex,
    values,
    skippedFields,
    layoutId: finishing ? "profile-card" : undefined,
  };

  return (
    <div className="flex flex-col gap-6">
      {showResumeBanner && phase === "question" && (
        <OnboardingResumeBanner
          questionNumber={stepIndex + 1}
          onDismiss={() => setShowResumeBanner(false)}
        />
      )}

      <OnboardingProgress
        stepIndex={stepIndex}
        totalSteps={PROFILE_QUESTIONS.length}
      />

      <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
        <div className="lg:col-span-3">
          <div className="rounded-[10px] border border-border bg-surface p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {phase === "chapterComplete" && (
                <OnboardingChapterComplete
                  key="chapter"
                  chapterTitle={currentQuestion.chapterTitle}
                  onContinue={handleChapterContinue}
                />
              )}
              {phase === "finishing" && (
                <motion.div
                  key="finish"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex min-h-[280px] flex-col items-center justify-center gap-3 px-4 py-12 text-center"
                >
                  <p className="font-heading text-lg font-medium text-text">
                    Dein Start-up-Profil ist bereit.
                  </p>
                  <p className="max-w-md text-sm text-text-muted">
                    Du kannst alles noch anpassen, bevor die Analyse startet.
                  </p>
                </motion.div>
              )}
              {phase === "question" && (
                <OnboardingQuestionPanel
                  key={currentQuestion.field}
                  question={currentQuestion}
                  value={currentValue}
                  onChange={handleFieldChange}
                  onNext={handleNext}
                  disabled={busy}
                  chapterIntro={chapterIntro}
                />
              )}
            </AnimatePresence>

            {phase === "question" && (
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
                {!currentQuestion.required && (
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
                  disabled={!canProceed || busy}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
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
            <OnboardingPreview {...previewProps} />
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <CollapsibleSection
          title={`Profil-Vorschau (${stepIndex + 1}/${PROFILE_QUESTIONS.length})`}
          defaultOpen={false}
        >
          <OnboardingPreview {...previewProps} />
        </CollapsibleSection>
      </div>
    </div>
  );
}
