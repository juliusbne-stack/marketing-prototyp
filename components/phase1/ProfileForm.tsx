"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeEuro,
  CircleHelp,
  Clock,
  HandHeart,
  Lightbulb,
  MapPin,
  MessageCircle,
  PackageCheck,
  Rocket,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
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

const fieldIcons: Record<ProfileFieldKey, LucideIcon> = {
  businessIdea: Lightbulb,
  productStatus: PackageCheck,
  region: MapPin,
  assumedTarget: UsersRound,
  assumedProblem: CircleHelp,
  valuePropDraft: HandHeart,
  revenueIdea: BadgeEuro,
  teamSize: UserRound,
  budgetMonthly: Wallet,
  timePerWeek: Clock,
  skills: Target,
  existingInsights: MessageCircle,
};

const profileInputClasses = `${inputClasses} min-h-10 rounded-[10px] border-[#dfe7ef] bg-white/95 px-3 text-[13px] shadow-[0_1px_2px_rgba(15,31,51,0.03)] focus:border-accent focus:bg-white`;
const profileTextareaClasses = `${textareaClasses} rounded-[10px] border-[#dfe7ef] bg-white/95 px-3 text-[13px] leading-relaxed shadow-[0_1px_2px_rgba(15,31,51,0.03)] focus:border-accent focus:bg-white`;

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
  const Icon = fieldIcons[field];

  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className ?? ""}`}>
      <span className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-[#132033]">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#95a8ba]" aria-hidden />
        <span className="truncate">
          {label}
          {required ? " *" : ""}
        </span>
      </span>
      {children}
    </label>
  );
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
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent-deep">
          <Rocket className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="font-heading text-base font-semibold text-[#132033]">
            Start-up-Profil
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#607086]">
            Nur die Geschäftsidee ist Pflicht. Je mehr du angibst, desto passgenauer
            wird der Analyse-Entwurf.
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <ProfileFieldLabel
          field="businessIdea"
          label={labelByField.businessIdea}
          required
          className="sm:col-span-2"
        >
          <textarea
            value={form.businessIdea}
            onChange={set("businessIdea")}
            rows={4}
            required
            placeholder="Was bietest du an, für wen, und was ist daran besonders?"
            className={`${profileTextareaClasses} min-h-[92px]`}
            disabled={busy}
          />
        </ProfileFieldLabel>

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

        <ProfileFieldLabel field="region" label={labelByField.region}>
          <input
            type="text"
            value={form.region}
            onChange={set("region")}
            placeholder="z. B. Köln und Umgebung, DACH, online"
            className={profileInputClasses}
            disabled={busy}
          />
        </ProfileFieldLabel>

        <ProfileFieldLabel
          field="assumedTarget"
          label={labelByField.assumedTarget}
        >
          <textarea
            value={form.assumedTarget}
            onChange={set("assumedTarget")}
            rows={3}
            placeholder="Leer lassen, wenn noch unklar — die KI schlägt Zielgruppenhypothesen vor"
            className={`${profileTextareaClasses} min-h-[78px]`}
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
            rows={3}
            placeholder="Welches Problem löst dein Angebot?"
            className={`${profileTextareaClasses} min-h-[78px]`}
            disabled={busy}
          />
        </ProfileFieldLabel>

        <ProfileFieldLabel
          field="valuePropDraft"
          label={labelByField.valuePropDraft}
        >
          <textarea
            value={form.valuePropDraft}
            onChange={set("valuePropDraft")}
            rows={3}
            placeholder="Warum sollten Kunden zu dir kommen?"
            className={`${profileTextareaClasses} min-h-[78px]`}
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
            rows={3}
            placeholder="Wie soll Geld verdient werden? (z. B. Abo, Kursgebühr)"
            className={`${profileTextareaClasses} min-h-[78px]`}
            disabled={busy}
          />
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
          field="budgetMonthly"
          label={labelByField.budgetMonthly}
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

        <ProfileFieldLabel
          field="timePerWeek"
          label={labelByField.timePerWeek}
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

        <ProfileFieldLabel field="skills" label={labelByField.skills}>
          <textarea
            value={form.skills}
            onChange={set("skills")}
            rows={3}
            placeholder="Was kannst du gut, welche Kanäle oder Netzwerke hast du schon?"
            className={`${profileTextareaClasses} min-h-[78px]`}
            disabled={busy}
          />
        </ProfileFieldLabel>

        <ProfileFieldLabel
          field="existingInsights"
          label={labelByField.existingInsights}
          className="sm:col-span-2"
        >
          <textarea
            value={form.existingInsights}
            onChange={set("existingInsights")}
            rows={3}
            placeholder="Rückmeldungen, Gespräche, erste Verkäufe — falls vorhanden"
            className={`${profileTextareaClasses} min-h-[62px]`}
            disabled={busy}
          />
        </ProfileFieldLabel>
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
