"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Sparkles } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";
import {
  BUDGET_OPTIONS,
  formValuesToPatchBody,
  PRODUCT_STATUS_OPTIONS,
  PROFILE_QUESTIONS,
  type ProfileFieldKey,
  projectToFormValues,
  TIME_OPTIONS,
  type ProfileData,
} from "@/lib/profileQuestions";
import { inputClasses, textareaClasses } from "@/lib/profileFieldStyles";

export type { ProfileData } from "@/lib/profileQuestions";

const profileInputClasses = `${inputClasses} min-h-10 rounded-[10px] border-[#dfe7ef] bg-white px-3 text-[13px] shadow-[0_1px_2px_rgba(15,31,51,0.03)] focus:border-accent focus:bg-white`;
const profileTextareaClasses = `${textareaClasses} rounded-[10px] border-[#dfe7ef] bg-white px-3 text-[13px] leading-relaxed shadow-[0_1px_2px_rgba(15,31,51,0.03)] focus:border-accent focus:bg-white`;

/** Kurzlabels für die kompakte Profilkarte (Screenshot-Layout). */
const FORM_LABELS: Partial<Record<ProfileFieldKey, string>> = {
  budgetMonthly: "Budget / Monat",
  timePerWeek: "Zeit / Woche fürs Marketing",
};

function ProfileFieldLabel({
  field,
  label,
  required,
  className,
  children,
}: {
  field: ProfileFieldKey;
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-[11px] font-semibold text-[#132033]">
        {FORM_LABELS[field] ?? label}
        {required ? (
          <span className="text-danger-text" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

function SectionCard({
  number,
  title,
  badge,
  className,
  children,
}: {
  number: number;
  title: string;
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`relative rounded-[10px] border border-[#e8eef4] bg-[#fbfcfd] p-4 sm:p-5 ${className ?? ""}`}
    >
      <div className="mb-4 flex items-center gap-2.5 pr-24">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[11px] font-bold text-accent-deep">
          {number}
        </span>
        <h4 className="font-heading text-sm font-semibold text-[#132033]">
          {title}
        </h4>
      </div>
      {badge}
      {children}
    </section>
  );
}

function isFieldFilled(value: string): boolean {
  return Boolean(value.trim());
}

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

  const { filledCount, totalFields, fillPercent } = useMemo(() => {
    const values = Object.values(form);
    const filled = values.filter(isFieldFilled).length;
    const total = PROFILE_QUESTIONS.length;
    return {
      filledCount: filled,
      totalFields: total,
      fillPercent: Math.round((filled / total) * 100),
    };
  }, [form]);

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
      className="rounded-[10px] border border-white/80 bg-white p-5 shadow-[0_18px_45px_rgba(31,36,33,0.08)] sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent-deep">
            <Rocket className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 pt-0.5">
            <h3 className="font-heading text-base font-semibold text-[#132033]">
              Start-up-Profil
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#607086]">
              Nur die Geschäftsidee ist Pflicht. Je mehr du angibst, desto
              passgenauer wird der Analyse-Entwurf.
            </p>
          </div>
        </div>

        <div
          className="w-full shrink-0 sm:w-[168px]"
          aria-label={`Profilfortschritt: ${filledCount} von ${totalFields} Feldern`}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12px] font-semibold text-[#132033]">
              {fillPercent}% ausgefüllt
            </span>
            <span className="text-[11px] text-[#607086]">
              {filledCount}/{totalFields} Felder
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#e8eef4]">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionCard
          number={1}
          title="Idee & Angebot"
          className="lg:col-span-2"
          badge={
            <span className="absolute right-4 top-4 rounded-md bg-[#fde8e4] px-2 py-0.5 text-[10px] font-semibold text-[#c45b4a] sm:right-5 sm:top-5">
              Geschäftsidee = Pflicht
            </span>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ProfileFieldLabel
              field="businessIdea"
              label={labelByField.businessIdea}
              required
            >
              <textarea
                value={form.businessIdea}
                onChange={set("businessIdea")}
                rows={8}
                required
                placeholder="Was bietest du an, für wen, und was ist daran besonders?"
                className={`${profileTextareaClasses} min-h-[168px]`}
                disabled={busy}
              />
            </ProfileFieldLabel>

            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileFieldLabel
                field="productStatus"
                label={labelByField.productStatus}
              >
                <select
                  value={form.productStatus}
                  onChange={set("productStatus")}
                  className={profileInputClasses}
                  disabled={busy}
                >
                  <option value="">Bitte wählen</option>
                  {PRODUCT_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </ProfileFieldLabel>

              <ProfileFieldLabel field="teamSize" label={labelByField.teamSize}>
                <input
                  type="number"
                  min={1}
                  value={form.teamSize}
                  onChange={set("teamSize")}
                  placeholder="z. B. 2"
                  className={profileInputClasses}
                  disabled={busy}
                />
              </ProfileFieldLabel>

              <ProfileFieldLabel
                field="region"
                label={labelByField.region}
                className="sm:col-span-2"
              >
                <input
                  type="text"
                  value={form.region}
                  onChange={set("region")}
                  placeholder="z. B. DACH, Köln, EU"
                  className={profileInputClasses}
                  disabled={busy}
                />
              </ProfileFieldLabel>

              <ProfileFieldLabel
                field="budgetMonthly"
                label={labelByField.budgetMonthly}
                className="sm:col-span-2"
              >
                <select
                  value={form.budgetMonthly}
                  onChange={set("budgetMonthly")}
                  className={profileInputClasses}
                  disabled={busy}
                >
                  <option value="">Bitte wählen</option>
                  {BUDGET_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </ProfileFieldLabel>
            </div>
          </div>
        </SectionCard>

        <SectionCard number={2} title="Markt & Zielgruppe">
          <div className="flex flex-col gap-4">
            <ProfileFieldLabel
              field="assumedTarget"
              label={labelByField.assumedTarget}
            >
              <textarea
                value={form.assumedTarget}
                onChange={set("assumedTarget")}
                rows={4}
                placeholder="Leer lassen, wenn noch unklar — die KI schlägt Zielgruppenhypothesen vor"
                className={`${profileTextareaClasses} min-h-[96px]`}
                disabled={busy}
              />
            </ProfileFieldLabel>

            <ProfileFieldLabel
              field="assumedProblem"
              label={labelByField.assumedProblem}
            >
              <textarea
                value={form.assumedProblem}
                onChange={set("assumedProblem")}
                rows={4}
                placeholder="Welches Problem löst dein Angebot?"
                className={`${profileTextareaClasses} min-h-[96px]`}
                disabled={busy}
              />
            </ProfileFieldLabel>
          </div>
        </SectionCard>

        <SectionCard number={3} title="Nutzen & Erlös">
          <div className="flex flex-col gap-4">
            <ProfileFieldLabel
              field="valuePropDraft"
              label={labelByField.valuePropDraft}
            >
              <textarea
                value={form.valuePropDraft}
                onChange={set("valuePropDraft")}
                rows={4}
                placeholder="Warum sollten Kunden zu dir kommen?"
                className={`${profileTextareaClasses} min-h-[96px]`}
                disabled={busy}
              />
            </ProfileFieldLabel>

            <ProfileFieldLabel
              field="revenueIdea"
              label={labelByField.revenueIdea}
            >
              <textarea
                value={form.revenueIdea}
                onChange={set("revenueIdea")}
                rows={4}
                placeholder="Wie soll Geld verdient werden? (z. B. Abo, Kursgebühr)"
                className={`${profileTextareaClasses} min-h-[96px]`}
                disabled={busy}
              />
            </ProfileFieldLabel>
          </div>
        </SectionCard>

        <SectionCard number={4} title="Ressourcen & Kanäle">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <ProfileFieldLabel
                field="timePerWeek"
                label={labelByField.timePerWeek}
                className="sm:min-w-0 sm:flex-1"
              >
                <select
                  value={form.timePerWeek}
                  onChange={set("timePerWeek")}
                  className={profileInputClasses}
                  disabled={busy}
                >
                  <option value="">Bitte wählen</option>
                  {TIME_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </ProfileFieldLabel>
              <p className="pb-2 text-[11px] leading-snug text-[#8a9aab] sm:max-w-[140px]">
                Team &amp; Budget oben in Sektion 1.
              </p>
            </div>

            <ProfileFieldLabel field="skills" label={labelByField.skills}>
              <textarea
                value={form.skills}
                onChange={set("skills")}
                rows={4}
                placeholder="Was kannst du gut, welche Kanäle oder Netzwerke hast du schon?"
                className={`${profileTextareaClasses} min-h-[96px]`}
                disabled={busy}
              />
            </ProfileFieldLabel>
          </div>
        </SectionCard>

        <SectionCard number={5} title="Erkenntnisse">
          <ProfileFieldLabel
            field="existingInsights"
            label={labelByField.existingInsights}
          >
            <textarea
              value={form.existingInsights}
              onChange={set("existingInsights")}
              rows={8}
              placeholder="Rückmeldungen, Gespräche, erste Verkäufe — falls vorhanden"
              className={`${profileTextareaClasses} min-h-[168px]`}
              disabled={busy}
            />
          </ProfileFieldLabel>
        </SectionCard>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#edf1f5] pt-4">
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
