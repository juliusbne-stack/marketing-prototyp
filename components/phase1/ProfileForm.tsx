"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";
import {
  BUDGET_OPTIONS,
  formValuesToPatchBody,
  PRODUCT_STATUS_OPTIONS,
  PROFILE_QUESTIONS,
  projectToFormValues,
  TIME_OPTIONS,
  type ProfileData,
} from "@/lib/profileQuestions";
import { inputClasses, labelClasses, textareaClasses } from "@/lib/profileFieldStyles";

export type { ProfileData } from "@/lib/profileQuestions";

/**
 * Structured start-up profile inputs (UI_KONZEPT phase 1). Submitting saves
 * the profile to the Project and then triggers the analysis via onAnalyze.
 */
export function ProfileForm({
  project,
  isGenerating,
  hasResults,
  hasAdopted,
  onAnalyze,
  layoutId,
}: {
  project: ProfileData;
  isGenerating: boolean;
  hasResults: boolean;
  hasAdopted?: boolean;
  onAnalyze: () => Promise<void>;
  layoutId?: string;
}) {
  const [form, setForm] = useState(() => projectToFormValues(project));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelByField = Object.fromEntries(
    PROFILE_QUESTIONS.map((question) => [question.field, question.label])
  ) as Record<(typeof PROFILE_QUESTIONS)[number]["field"], string>;

  function set(field: keyof typeof form) {
    return (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => setForm({ ...form, [field]: event.target.value });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.businessIdea.trim() || isSaving || isGenerating) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          formValuesToPatchBody(project.id, form, {
            profileOnboardingComplete: true,
          })
        ),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "Das Profil konnte nicht gespeichert werden. Erneut versuchen — deine Eingaben bleiben erhalten."
        );
      }
      await onAnalyze();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das Profil konnte nicht gespeichert werden. Erneut versuchen — deine Eingaben bleiben erhalten."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const busy = isSaving || isGenerating;

  return (
    <motion.form
      layoutId={layoutId}
      onSubmit={handleSubmit}
      className="rounded-[10px] border border-border bg-surface p-4"
    >
      <h3 className="font-heading text-base font-medium text-text">
        Start-up-Profil
      </h3>
      <p className="mt-1 text-xs text-text-muted">
        Nur die Geschäftsidee ist Pflicht. Je mehr du angibst, desto passgenauer
        wird der Analyse-Entwurf.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={`${labelClasses} sm:col-span-2`}>
          {labelByField.businessIdea} *
          <textarea
            value={form.businessIdea}
            onChange={set("businessIdea")}
            rows={4}
            required
            placeholder="Was bietest du an, für wen, und was ist daran besonders?"
            className={textareaClasses}
            disabled={busy}
          />
        </label>

        <label className={labelClasses}>
          {labelByField.productStatus}
          <select
            value={form.productStatus}
            onChange={set("productStatus")}
            className={inputClasses}
            disabled={busy}
          >
            <option value="">Bitte wählen</option>
            {PRODUCT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClasses}>
          {labelByField.region}
          <input
            type="text"
            value={form.region}
            onChange={set("region")}
            placeholder="z. B. Köln und Umgebung, DACH, online"
            className={inputClasses}
            disabled={busy}
          />
        </label>

        <label className={labelClasses}>
          {labelByField.assumedTarget}
          <textarea
            value={form.assumedTarget}
            onChange={set("assumedTarget")}
            rows={3}
            placeholder="Leer lassen, wenn noch unklar — die KI schlägt Zielgruppenhypothesen vor"
            className={textareaClasses}
            disabled={busy}
          />
        </label>

        <label className={labelClasses}>
          {labelByField.assumedProblem}
          <textarea
            value={form.assumedProblem}
            onChange={set("assumedProblem")}
            rows={3}
            placeholder="Welches Problem löst dein Angebot?"
            className={textareaClasses}
            disabled={busy}
          />
        </label>

        <label className={labelClasses}>
          {labelByField.valuePropDraft}
          <textarea
            value={form.valuePropDraft}
            onChange={set("valuePropDraft")}
            rows={3}
            placeholder="Warum sollten Kunden zu dir kommen?"
            className={textareaClasses}
            disabled={busy}
          />
        </label>

        <label className={labelClasses}>
          {labelByField.revenueIdea}
          <textarea
            value={form.revenueIdea}
            onChange={set("revenueIdea")}
            rows={3}
            placeholder="Wie soll Geld verdient werden? (z. B. Abo, Kursgebühr)"
            className={textareaClasses}
            disabled={busy}
          />
        </label>

        <label className={labelClasses}>
          {labelByField.teamSize}
          <input
            type="number"
            min={1}
            value={form.teamSize}
            onChange={set("teamSize")}
            placeholder="z. B. 2"
            className={inputClasses}
            disabled={busy}
          />
        </label>

        <label className={labelClasses}>
          {labelByField.budgetMonthly}
          <select
            value={form.budgetMonthly}
            onChange={set("budgetMonthly")}
            className={inputClasses}
            disabled={busy}
          >
            <option value="">Bitte wählen</option>
            {BUDGET_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClasses}>
          {labelByField.timePerWeek}
          <select
            value={form.timePerWeek}
            onChange={set("timePerWeek")}
            className={inputClasses}
            disabled={busy}
          >
            <option value="">Bitte wählen</option>
            {TIME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className={labelClasses}>
          {labelByField.skills}
          <textarea
            value={form.skills}
            onChange={set("skills")}
            rows={3}
            placeholder="Was kannst du gut, welche Kanäle oder Netzwerke hast du schon?"
            className={textareaClasses}
            disabled={busy}
          />
        </label>

        <label className={labelClasses}>
          {labelByField.existingInsights}
          <textarea
            value={form.existingInsights}
            onChange={set("existingInsights")}
            rows={3}
            placeholder="Rückmeldungen, Gespräche, erste Verkäufe — falls vorhanden"
            className={textareaClasses}
            disabled={busy}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <ProgressButton
          type="submit"
          loading={busy}
          loadingPhase={isGenerating ? "generate" : "save"}
          loadingLabel={
            isGenerating
              ? "Analyse wird erstellt …"
              : "Profil wird gespeichert …"
          }
          disabled={!form.businessIdea.trim()}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Analyse erstellen
        </ProgressButton>
        {hasResults && !busy && (
          <span className="text-xs text-text-muted">
            {hasAdopted
              ? "Erneute Analyse ergänzt nur neue, noch nicht abgedeckte Aussagen — übernommene bleiben erhalten, nicht übernommene Entwürfe werden ersetzt."
              : "Erneutes Erstellen ersetzt nicht übernommene Entwürfe — übernommene Aussagen bleiben erhalten."}
          </span>
        )}
        {error && <p className="text-xs text-danger-text">{error}</p>}
      </div>
    </motion.form>
  );
}
