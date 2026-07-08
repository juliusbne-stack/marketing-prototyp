"use client";

import { useEffect, useRef } from "react";

export function OnboardingChoiceCards({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!containerRef.current?.contains(document.activeElement)) return;
      const currentIndex = options.findIndex((option) => option === value);
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const next = options[Math.min(currentIndex + 1, options.length - 1)];
        if (next) onChange(next);
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const prev = options[Math.max(currentIndex - 1, 0)];
        if (prev) onChange(prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChange, options, value]);

  return (
    <div ref={containerRef} className="grid gap-2 sm:grid-cols-3" role="listbox">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="option"
            aria-selected={selected}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`rounded-md border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent-soft disabled:opacity-50 ${
              selected
                ? "border-accent bg-accent-soft font-medium text-accent"
                : "border-border bg-surface text-text hover:border-accent/40"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
