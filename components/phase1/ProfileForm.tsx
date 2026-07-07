"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

export type ProfileData = {
  id: string;
  businessIdea: string | null;
  productStatus: string | null;
  assumedTarget: string | null;
  assumedProblem: string | null;
  valuePropDraft: string | null;
  revenueIdea: string | null;
  region: string | null;
  teamSize: number | null;
  budgetMonthly: string | null;
  timePerWeek: string | null;
  skills: string | null;
  existingInsights: string | null;
};

const PRODUCT_STATUS_OPTIONS = ["Idee", "MVP", "am Markt"];
const BUDGET_OPTIONS = ["unter 500 €", "500–2000 €", "über 2000 €"];
const TIME_OPTIONS = [
  "unter 5 Stunden",
  "5–10 Stunden",
  "10–20 Stunden",
  "über 20 Stunden",
];

const inputClasses =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted";
const textareaClasses = `${inputClasses} resize-none`;
const labelClasses = "flex flex-col gap-1 text-xs font-medium text-text-muted";

/**
 * Structured start-up profile inputs (UI_KONZEPT phase 1). Submitting saves
 * the profile to the Project and then triggers the analysis via onAnalyze.
 */
export function ProfileForm({
  project,
  isGenerating,
  hasResults,
  onAnalyze,
}: {
  project: ProfileData;
  isGenerating: boolean;
  hasResults: boolean;
  onAnalyze: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    businessIdea: project.businessIdea ?? "",
    productStatus: project.productStatus ?? "",
    assumedTarget: project.assumedTarget ?? "",
    assumedProblem: project.assumedProblem ?? "",
    valuePropDraft: project.valuePropDraft ?? "",
    revenueIdea: project.revenueIdea ?? "",
    region: project.region ?? "",
    teamSize: project.teamSize != null ? String(project.teamSize) : "",
    budgetMonthly: project.budgetMonthly ?? "",
    timePerWeek: project.timePerWeek ?? "",
    skills: project.skills ?? "",
    existingInsights: project.existingInsights ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({
          id: project.id,
          businessIdea: form.businessIdea.trim(),
          productStatus: form.productStatus || null,
          assumedTarget: form.assumedTarget.trim() || null,
          assumedProblem: form.assumedProblem.trim() || null,
          valuePropDraft: form.valuePropDraft.trim() || null,
          revenueIdea: form.revenueIdea.trim() || null,
          region: form.region.trim() || null,
          teamSize: form.teamSize ? Number(form.teamSize) : null,
          budgetMonthly: form.budgetMonthly || null,
          timePerWeek: form.timePerWeek || null,
          skills: form.skills.trim() || null,
          existingInsights: form.existingInsights.trim() || null,
        }),
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
    <form
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
          Geschäftsidee / Angebot *
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
          Produktstatus
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
          Region / geplanter Markt
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
          Vermutete Zielgruppe
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
          Vermutetes Kundenproblem
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
          Nutzenversprechen
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
          Erlösidee
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
          Teamgröße
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
          Budget pro Monat
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
          Zeit pro Woche fürs Marketing
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
          Fähigkeiten & Kanäle
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
          Bisherige Kundenerkenntnisse
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
        <button
          type="submit"
          disabled={busy || !form.businessIdea.trim()}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {isGenerating
            ? "Analyse wird erstellt …"
            : isSaving
              ? "Profil wird gespeichert …"
              : "Analyse erstellen"}
        </button>
        {hasResults && !busy && (
          <span className="text-xs text-text-muted">
            Erneutes Erstellen ersetzt nicht übernommene Entwürfe — übernommene
            Aussagen bleiben erhalten.
          </span>
        )}
        {error && <p className="text-xs text-danger-text">{error}</p>}
      </div>
    </form>
  );
}
