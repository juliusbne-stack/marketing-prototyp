"use client";

import { useEffect, useRef, useState } from "react";

export type ProgressLoadingPhase = "save" | "generate";

const SAVE_CAP = 15;
const SAVE_MS = 400;
const GENERATE_TAU = 12000;
const MAX_PROGRESS = 92;

function stripTrailingEllipsis(label: string): string {
  return label.replace(/\s*(\.{3}|…)\s*$/, "");
}

function LoadingDots() {
  return (
    <span className="inline-flex w-[0.9em] items-baseline" aria-hidden>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="loading-dot-bounce inline-block w-[0.3em] text-center"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          .
        </span>
      ))}
    </span>
  );
}

function computeProgress(phase: ProgressLoadingPhase, elapsed: number): number {
  if (phase === "save") {
    return Math.min(SAVE_CAP, (elapsed / SAVE_MS) * SAVE_CAP);
  }
  const generateElapsed = Math.max(0, elapsed - SAVE_MS);
  return Math.min(
    MAX_PROGRESS,
    SAVE_CAP +
      (MAX_PROGRESS - SAVE_CAP) * (1 - Math.exp(-generateElapsed / GENERATE_TAU))
  );
}

/**
 * Primary action button with a subtle background fill that advances while loading.
 * Progress is estimated (no real API progress) and completes at 100 % when done.
 */
export function ProgressButton({
  loading = false,
  loadingPhase = "generate",
  loadingLabel,
  children,
  disabled,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingPhase?: ProgressLoadingPhase;
  loadingLabel?: string;
}) {
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (loading) {
      if (!wasLoadingRef.current) {
        startRef.current = Date.now();
        setProgress(0);
      }
      wasLoadingRef.current = true;

      const id = setInterval(() => {
        const elapsed = Date.now() - (startRef.current ?? Date.now());
        setProgress(computeProgress(loadingPhase, elapsed));
      }, 100);

      return () => clearInterval(id);
    }

    if (wasLoadingRef.current) {
      wasLoadingRef.current = false;
      startRef.current = null;
      setProgress(100);
      const timeout = setTimeout(() => {
        setProgress(0);
      }, 350);
      return () => clearTimeout(timeout);
    }
  }, [loading, loadingPhase]);

  const isDisabled = disabled || loading;
  const showProgress = progress > 0;

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={loading}
      className={`inline-flex items-center gap-1.5 overflow-hidden rounded-md border border-accent bg-accent px-4 py-2 text-sm font-medium text-white shadow-none transition-[background-color,border-color,opacity] appearance-none hover:border-accent-bright hover:bg-accent-bright active:border-brand-dark active:bg-brand-dark disabled:cursor-not-allowed ${
        loading ? "" : "disabled:opacity-50"
      } ${className}`}
      style={
        showProgress
          ? {
              backgroundImage: `linear-gradient(90deg, var(--accent-bright) ${progress}%, var(--accent) ${progress}%)`,
              backgroundColor: "var(--accent)",
              borderColor: "var(--accent)",
            }
          : undefined
      }
    >
      {loading && loadingLabel ? (
        <>
          {stripTrailingEllipsis(loadingLabel)}
          <LoadingDots />
        </>
      ) : (
        children
      )}
    </button>
  );
}
