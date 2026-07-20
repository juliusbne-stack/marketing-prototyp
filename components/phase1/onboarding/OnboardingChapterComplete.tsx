"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function OnboardingChapterComplete({
  chapterTitle,
  onContinue,
}: {
  chapterTitle: string;
  onContinue: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onContinue, 1200);
    return () => window.clearTimeout(timer);
  }, [onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-[10px] border border-border bg-surface px-6 py-12 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
        <Check className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <p className="font-heading text-lg font-medium text-text">
          Kapitel abgeschlossen
        </p>
        <p className="mt-1 text-sm text-text-muted">{chapterTitle}</p>
      </div>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-bright active:bg-brand-dark"
      >
        Weiter
      </button>
    </motion.div>
  );
}
