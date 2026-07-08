"use client";

import { Minus, Plus } from "lucide-react";
import { inputClasses } from "@/lib/profileFieldStyles";

export function OnboardingNumberStepper({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const numeric = value ? Number(value) : 0;

  function setNumber(next: number) {
    if (next < 1) return;
    onChange(String(next));
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={disabled || numeric <= 1}
        onClick={() => setNumber(numeric <= 1 ? 1 : numeric - 1)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-accent-soft disabled:opacity-50"
        aria-label="Verringern"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="z. B. 2"
        disabled={disabled}
        className={`${inputClasses} max-w-[120px] text-center`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setNumber(numeric < 1 ? 1 : numeric + 1)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-text transition-colors hover:bg-accent-soft disabled:opacity-50"
        aria-label="Erhöhen"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
