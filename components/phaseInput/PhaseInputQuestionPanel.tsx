"use client";

import { motion } from "framer-motion";
import type {
  AssetsValue,
  BudgetZeitValue,
  KapazitaetValue,
  KernangebotValue,
  MethodPreference,
  PhaseInputAnswer,
  PhaseInputQuestion,
} from "@/lib/phaseInput";
import { inputClasses, textareaClasses } from "@/lib/profileFieldStyles";
import { OnboardingChoiceCards } from "@/components/phase1/onboarding/OnboardingChoiceCards";

function KernangebotInput({
  value,
  onChange,
  disabled,
}: {
  value: KernangebotValue;
  onChange: (value: KernangebotValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <OnboardingChoiceCards
        options={["fix", "offen für Varianten"]}
        value={value.mode === "fix" ? "fix" : "offen für Varianten"}
        onChange={(selected) =>
          onChange({
            ...value,
            mode: selected === "fix" ? "fix" : "offen",
          })
        }
        disabled={disabled}
      />
      <div>
        <label className="mb-1.5 block text-sm text-text-muted">
          Optional: Was genau ist gesetzt oder welche Varianten denkst du?
        </label>
        <textarea
          value={value.detail ?? ""}
          onChange={(event) =>
            onChange({ ...value, detail: event.target.value })
          }
          rows={3}
          disabled={disabled}
          placeholder="z. B. Kursbuchung ist fix, Mitgliedschaft wäre denkbar"
          className={textareaClasses}
        />
      </div>
    </div>
  );
}

function MethodMatrixInput({
  methods,
  value,
  onChange,
  disabled,
}: {
  methods: readonly { id: string; label: string }[];
  value: Record<string, MethodPreference>;
  onChange: (value: Record<string, MethodPreference>) => void;
  disabled?: boolean;
}) {
  const prefs: MethodPreference[] = ["ja", "nein", "egal"];

  return (
    <div className="flex flex-col gap-3">
      {methods.map((method) => (
        <div
          key={method.id}
          className="flex flex-col gap-2 rounded-md border border-border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="text-sm text-text">{method.label}</span>
          <div className="flex gap-1">
            {prefs.map((pref) => {
              const selected = (value[method.id] ?? "egal") === pref;
              return (
                <button
                  key={pref}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange({ ...value, [method.id]: pref })
                  }
                  className={`rounded-md px-2.5 py-1 text-xs capitalize transition-colors disabled:opacity-50 ${
                    selected
                      ? "bg-accent text-white"
                      : "border border-border bg-surface text-text-muted hover:text-text"
                  }`}
                >
                  {pref}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetZeitInput({
  value,
  onChange,
  disabled,
}: {
  value: BudgetZeitValue;
  onChange: (value: BudgetZeitValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">
          Budget (€)
        </label>
        <input
          type="number"
          min={0}
          value={value.budgetSkipped ? "" : (value.budgetEur ?? "")}
          onChange={(event) =>
            onChange({
              ...value,
              budgetEur: event.target.value
                ? Number(event.target.value)
                : null,
              budgetSkipped: false,
            })
          }
          disabled={disabled || value.budgetSkipped}
          placeholder="z. B. 200"
          className={inputClasses}
        />
        <label className="mt-2 flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={value.budgetSkipped}
            onChange={(event) =>
              onChange({
                ...value,
                budgetSkipped: event.target.checked,
                budgetEur: event.target.checked ? null : value.budgetEur,
              })
            }
            disabled={disabled}
          />
          Später klären
        </label>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">
          Zeitraum (Wochen)
        </label>
        <input
          type="number"
          min={1}
          value={value.weeksSkipped ? "" : (value.weeks ?? "")}
          onChange={(event) =>
            onChange({
              ...value,
              weeks: event.target.value ? Number(event.target.value) : null,
              weeksSkipped: false,
            })
          }
          disabled={disabled || value.weeksSkipped}
          placeholder="z. B. 4"
          className={inputClasses}
        />
        <label className="mt-2 flex items-center gap-2 text-xs text-text-muted">
          <input
            type="checkbox"
            checked={value.weeksSkipped}
            onChange={(event) =>
              onChange({
                ...value,
                weeksSkipped: event.target.checked,
                weeks: event.target.checked ? null : value.weeks,
              })
            }
            disabled={disabled}
          />
          Später klären
        </label>
      </div>
    </div>
  );
}

function MultiCheckboxInput({
  options,
  value,
  onChange,
  sonstigesPlaceholder,
  disabled,
}: {
  options: readonly string[];
  value: AssetsValue;
  onChange: (value: AssetsValue) => void;
  sonstigesPlaceholder?: string;
  disabled?: boolean;
}) {
  function toggle(option: string) {
    const selected = value.selected.includes(option)
      ? value.selected.filter((item) => item !== option)
      : [...value.selected, option];
    onChange({ ...value, selected });
  }

  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => (
        <label
          key={option}
          className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
        >
          <input
            type="checkbox"
            checked={value.selected.includes(option)}
            onChange={() => toggle(option)}
            disabled={disabled}
          />
          {option}
        </label>
      ))}
      <input
        type="text"
        value={value.sonstiges ?? ""}
        onChange={(event) =>
          onChange({ ...value, sonstiges: event.target.value })
        }
        disabled={disabled}
        placeholder={sonstigesPlaceholder ?? "Sonstiges"}
        className={inputClasses}
      />
    </div>
  );
}

function KapazitaetInput({
  skillOptions,
  value,
  onChange,
  disabled,
}: {
  skillOptions: readonly string[];
  value: KapazitaetValue;
  onChange: (value: KapazitaetValue) => void;
  disabled?: boolean;
}) {
  function toggleSkill(skill: string) {
    const skills = value.skills.includes(skill)
      ? value.skills.filter((item) => item !== skill)
      : [...value.skills, skill];
    onChange({ ...value, skills });
  }

  return (
    <div className="flex flex-col gap-4">
      <OnboardingChoiceCards
        options={["allein", "kleines Team"]}
        value={value.team}
        onChange={(team) =>
          onChange({
            ...value,
            team: team as KapazitaetValue["team"],
          })
        }
        disabled={disabled}
      />
      <div>
        <p className="mb-2 text-sm text-text-muted">Fähigkeiten im Team:</p>
        <div className="flex flex-col gap-2">
          {skillOptions.map((skill) => (
            <label
              key={skill}
              className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-text"
            >
              <input
                type="checkbox"
                checked={value.skills.includes(skill)}
                onChange={() => toggleSkill(skill)}
                disabled={disabled}
              />
              {skill}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PhaseInputQuestionPanel({
  question,
  answer,
  onChange,
  onNext,
  disabled,
}: {
  question: PhaseInputQuestion;
  answer: PhaseInputAnswer;
  onChange: (answer: PhaseInputAnswer) => void;
  onNext: () => void;
  disabled?: boolean;
}) {
  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Enter") return;
    if (question.inputType === "textarea" && event.shiftKey) return;
    event.preventDefault();
    onNext();
  }

  return (
    <motion.div
      key={question.key}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-6"
      onKeyDown={handleKeyDown}
    >
      <div>
        <h2 className="font-heading text-xl font-medium leading-snug text-text sm:text-2xl">
          {question.question}
        </h2>
        {question.hint && (
          <p className="mt-2 text-sm text-text-muted">{question.hint}</p>
        )}
      </div>

      <div>
        {(question.inputType === "textarea" ||
          question.inputType === "text") && (
          question.inputType === "textarea" ? (
            <textarea
              value={(answer.value as string) ?? ""}
              onChange={(event) =>
                onChange({ ...answer, value: event.target.value, skipped: false })
              }
              rows={4}
              placeholder={question.placeholder}
              disabled={disabled}
              autoFocus
              className={textareaClasses}
            />
          ) : (
            <input
              type="text"
              value={(answer.value as string) ?? ""}
              onChange={(event) =>
                onChange({ ...answer, value: event.target.value, skipped: false })
              }
              placeholder={question.placeholder}
              disabled={disabled}
              autoFocus
              className={inputClasses}
            />
          )
        )}
        {question.inputType === "choice" && (
          <OnboardingChoiceCards
            options={question.options}
            value={(answer.value as string) ?? ""}
            onChange={(value) =>
              onChange({ ...answer, value, skipped: false })
            }
            disabled={disabled}
          />
        )}
        {question.inputType === "kernangebot" && (
          <KernangebotInput
            value={(answer.value as KernangebotValue) ?? { mode: "fix" }}
            onChange={(value) =>
              onChange({ ...answer, value, skipped: false })
            }
            disabled={disabled}
          />
        )}
        {question.inputType === "methodMatrix" && (
          <MethodMatrixInput
            methods={question.methods}
            value={
              (answer.value as Record<string, MethodPreference>) ?? {}
            }
            onChange={(value) =>
              onChange({ ...answer, value, skipped: false })
            }
            disabled={disabled}
          />
        )}
        {question.inputType === "budgetZeit" && (
          <BudgetZeitInput
            value={
              (answer.value as BudgetZeitValue) ?? {
                budgetEur: null,
                budgetSkipped: false,
                weeks: null,
                weeksSkipped: false,
              }
            }
            onChange={(value) =>
              onChange({ ...answer, value, skipped: false })
            }
            disabled={disabled}
          />
        )}
        {question.inputType === "multiCheckbox" && (
          <MultiCheckboxInput
            options={question.options}
            value={
              (answer.value as AssetsValue) ?? { selected: [], sonstiges: "" }
            }
            onChange={(value) =>
              onChange({ ...answer, value, skipped: false })
            }
            sonstigesPlaceholder={question.sonstigesPlaceholder}
            disabled={disabled}
          />
        )}
        {question.inputType === "kapazitaet" && (
          <KapazitaetInput
            skillOptions={question.skillOptions}
            value={
              (answer.value as KapazitaetValue) ?? {
                team: "allein",
                skills: [],
              }
            }
            onChange={(value) =>
              onChange({ ...answer, value, skipped: false })
            }
            disabled={disabled}
          />
        )}
      </div>
    </motion.div>
  );
}
