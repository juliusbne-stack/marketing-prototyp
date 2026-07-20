"use client";

import { ArrowRight, Check, X } from "lucide-react";

// Before/after text proposal — same visual language as other KI preview cards.
export function TextChangeProposalCard({
  zielLabel,
  vorher,
  nachher,
  begruendung,
  adopted,
  discarded,
  isAdopting,
  onAdopt,
  onDiscard,
}: {
  zielLabel: string;
  vorher: string;
  nachher: string;
  begruendung: string;
  adopted?: boolean;
  discarded?: boolean;
  isAdopting?: boolean;
  onAdopt: () => void;
  onDiscard: () => void;
}) {
  const disabled = adopted || discarded || isAdopting;

  return (
    <div className="rounded-[10px] border border-dashed border-accent/50 bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {zielLabel}
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 rounded-md border border-border bg-background/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
            Vorher
          </p>
          <p className="mt-1 text-sm leading-relaxed text-text-muted">{vorher}</p>
        </div>
        <ArrowRight
          className="mx-auto hidden h-4 w-4 shrink-0 text-text-muted sm:mt-8 sm:block"
          aria-hidden
        />
        <div className="min-w-0 flex-1 rounded-md border border-accent/30 bg-accent-soft/20 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-deep">
            Nachher
          </p>
          <p className="mt-1 text-sm leading-relaxed text-text">{nachher}</p>
        </div>
      </div>

      <p className="mt-3 rounded-md bg-accent-soft p-2.5 text-xs leading-relaxed text-accent-deep">
        <span className="font-semibold">Begründung:</span> {begruendung}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAdopt}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-bright active:bg-brand-dark disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" aria-hidden />
          {adopted ? "Übernommen" : "Übernehmen"}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-text transition-colors hover:bg-background disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          {discarded ? "Verworfen" : "Verwerfen"}
        </button>
      </div>
    </div>
  );
}
