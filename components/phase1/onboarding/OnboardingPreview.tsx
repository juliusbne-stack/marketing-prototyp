"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  PROFILE_QUESTIONS,
  type ProfileFieldKey,
} from "@/lib/profileQuestions";

export function OnboardingPreview({
  stepIndex,
  values,
  skippedFields,
  layoutId,
}: {
  stepIndex: number;
  values: Record<ProfileFieldKey, string>;
  skippedFields: Set<ProfileFieldKey>;
  layoutId?: string;
}) {
  const answeredCount = PROFILE_QUESTIONS.filter((question, index) => {
    if (index >= stepIndex) return false;
    if (skippedFields.has(question.field)) return false;
    const value = values[question.field];
    return Boolean(value?.trim());
  }).length;

  return (
    <motion.div
      layoutId={layoutId}
      className="rounded-[10px] border border-border bg-surface p-4"
    >
      <h3 className="font-heading text-base font-medium text-text">
        Start-up-Profil
      </h3>
      <p className="mt-1 text-xs text-text-muted">
        {answeredCount} von {PROFILE_QUESTIONS.length} beantwortet
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {PROFILE_QUESTIONS.map((question, index) => {
          const isCurrent = index === stepIndex;
          const isPast = index < stepIndex;
          const isSkipped = skippedFields.has(question.field);
          const value = values[question.field]?.trim();
          const isAnswered = isPast && !isSkipped && Boolean(value);

          return (
            <motion.li
              key={question.field}
              initial={isPast && (isAnswered || isSkipped) ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-xs ${
                isCurrent ? "bg-accent-soft" : ""
              }`}
            >
              <span className="mt-0.5 shrink-0" aria-hidden>
                {isAnswered ? (
                  <Check className="h-3.5 w-3.5 text-evidence-fact-text" />
                ) : isSkipped ? (
                  <span className="inline-flex rounded-full border border-evidence-question-border bg-evidence-question-bg px-1.5 py-0.5 text-[10px] font-medium text-evidence-question-text">
                    Offen
                  </span>
                ) : (
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full border ${
                      isCurrent ? "border-accent bg-accent/20" : "border-border"
                    }`}
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium ${
                    isCurrent ? "text-accent" : "text-text"
                  }`}
                >
                  {question.label}
                </p>
                {isAnswered && (
                  <p className="mt-0.5 line-clamp-2 text-text-muted">{value}</p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}
