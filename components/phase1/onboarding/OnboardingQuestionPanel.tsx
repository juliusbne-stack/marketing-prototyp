"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import type { ProfileQuestion } from "@/lib/profileQuestions";
import { inputClasses, textareaClasses } from "@/lib/profileFieldStyles";
import { OnboardingChoiceCards } from "./OnboardingChoiceCards";
import { OnboardingNumberStepper } from "./OnboardingNumberStepper";

export function OnboardingQuestionPanel({
  question,
  value,
  onChange,
  onNext,
  disabled,
  chapterIntro,
}: {
  question: ProfileQuestion;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  disabled?: boolean;
  chapterIntro?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "Enter") return;
    if (question.inputType === "textarea" && event.shiftKey) return;
    if (question.required && !value.trim()) return;
    event.preventDefault();
    onNext();
  }

  return (
    <motion.div
      key={question.field}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-6"
      onKeyDown={handleKeyDown}
    >
      {chapterIntro && (
        <p className="rounded-md border border-border bg-background px-3 py-2 text-sm text-text-muted">
          {chapterIntro}
        </p>
      )}

      <div>
        <h2 className="font-heading text-xl font-medium leading-snug text-text sm:text-2xl">
          {question.question}
        </h2>
        {question.hint && (
          <p className="mt-2 text-sm text-text-muted">{question.hint}</p>
        )}
      </div>

      <div>
        {question.inputType === "textarea" && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={question.field === "businessIdea" ? 5 : 4}
            placeholder={question.placeholder}
            disabled={disabled}
            autoFocus
            className={textareaClasses}
          />
        )}
        {question.inputType === "text" && (
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder}
            disabled={disabled}
            autoFocus
            className={inputClasses}
          />
        )}
        {question.inputType === "choice" && question.options && (
          <OnboardingChoiceCards
            options={question.options}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        )}
        {question.inputType === "number" && (
          <OnboardingNumberStepper
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        )}
      </div>
    </motion.div>
  );
}
