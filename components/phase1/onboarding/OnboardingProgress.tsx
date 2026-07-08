"use client";

import { motion } from "framer-motion";
import { getChapterProgress } from "@/lib/profileQuestions";

export function OnboardingProgress({
  stepIndex,
  totalSteps,
}: {
  stepIndex: number;
  totalSteps: number;
}) {
  const { chapter, chapterTitle, questionNumber } = getChapterProgress(stepIndex);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5" aria-hidden>
          {Array.from({ length: totalSteps }, (_, index) => {
            const isActive = index === stepIndex;
            const isDone = index < stepIndex;
            return (
              <motion.span
                key={index}
                layout
                animate={{
                  scale: isActive ? 1.2 : 1,
                }}
                transition={{ duration: 0.2 }}
                className={`h-2 w-2 rounded-full ${
                  isActive
                    ? "bg-accent"
                    : isDone
                      ? "bg-accent-soft ring-1 ring-accent/30"
                      : "bg-border"
                }`}
              />
            );
          })}
        </div>
        <p className="shrink-0 text-xs text-text-muted">
          Kapitel {chapter} · Frage {questionNumber}/{totalSteps}
        </p>
      </div>
      <p className="text-xs font-medium text-accent">{chapterTitle}</p>
    </div>
  );
}
