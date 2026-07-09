"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  answerToDisplayText,
  getQuestionsForPhase,
  type PhaseInputAnswer,
  type PhaseInputPhase,
} from "@/lib/phaseInput";

export function PhaseInputPreview({
  phase,
  stepIndex,
  answers,
  skippedKeys,
  title,
}: {
  phase: PhaseInputPhase;
  stepIndex: number;
  answers: Record<string, PhaseInputAnswer>;
  skippedKeys: Set<string>;
  title: string;
}) {
  const questions = getQuestionsForPhase(phase);
  const answeredCount = questions.filter((question, index) => {
    if (index >= stepIndex) return false;
    const answer = answers[question.key];
    if (!answer) return false;
    return skippedKeys.has(question.key) || hasAnswerContent(question.key, answer, phase);
  }).length;

  function hasAnswerContent(
    key: string,
    answer: PhaseInputAnswer,
    p: PhaseInputPhase
  ) {
    const question = getQuestionsForPhase(p).find((q) => q.key === key);
    if (!question) return false;
    return answerToDisplayText(question, answer) != null;
  }

  return (
    <motion.div className="rounded-[10px] border border-border bg-surface p-4">
      <h3 className="font-heading text-base font-medium text-text">{title}</h3>
      <p className="mt-1 text-xs text-text-muted">
        {answeredCount} von {questions.length} beantwortet
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {questions.map((question, index) => {
          const isCurrent = index === stepIndex;
          const isPast = index < stepIndex;
          const isSkipped = skippedKeys.has(question.key);
          const answer = answers[question.key];
          const display = answer
            ? answerToDisplayText(question, answer)
            : null;
          const isAnswered = isPast && !isSkipped && Boolean(display);

          return (
            <motion.li
              key={question.key}
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
                {isAnswered && display && (
                  <p className="mt-0.5 line-clamp-2 text-text-muted">{display}</p>
                )}
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}
