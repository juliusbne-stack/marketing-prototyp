"use client";

import { useState } from "react";
import { Clock, Coins, Pencil } from "lucide-react";

export function StepImplementationFrame({
  timeframe,
  budgetFrame,
  readOnly = false,
  onSave,
}: {
  timeframe: string | null;
  budgetFrame: string | null;
  readOnly?: boolean;
  onSave?: (data: {
    timeframe: string | null;
    budgetFrame: string | null;
  }) => Promise<boolean>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTimeframe, setDraftTimeframe] = useState(timeframe ?? "");
  const [draftBudgetFrame, setDraftBudgetFrame] = useState(budgetFrame ?? "");
  const [isBusy, setIsBusy] = useState(false);

  if (!timeframe && !budgetFrame && readOnly) {
    return null;
  }

  async function handleSave() {
    if (!onSave) return;
    setIsBusy(true);
    const ok = await onSave({
      timeframe: draftTimeframe.trim() || null,
      budgetFrame: draftBudgetFrame.trim() || null,
    });
    setIsBusy(false);
    if (ok) setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="mt-1.5 flex flex-col gap-2 rounded-md border border-border bg-background p-2.5">
        <label className="block text-xs font-medium text-text">
          Zeitraum
          <input
            type="text"
            value={draftTimeframe}
            onChange={(event) => setDraftTimeframe(event.target.value)}
            placeholder="z. B. 3 Wochen"
            className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
          />
        </label>
        <label className="block text-xs font-medium text-text">
          Budgetrahmen
          <input
            type="text"
            value={draftBudgetFrame}
            onChange={(event) => setDraftBudgetFrame(event.target.value)}
            placeholder="z. B. max. 150 € von 500 €/Monat"
            className="mt-1 w-full rounded-md border border-border bg-surface p-2 text-sm text-text"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isBusy}
            className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            Speichern
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftTimeframe(timeframe ?? "");
              setDraftBudgetFrame(budgetFrame ?? "");
              setIsEditing(false);
            }}
            disabled={isBusy}
            className="rounded-md border border-border px-3 py-1 text-xs text-text transition-colors hover:bg-background"
          >
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  if (!timeframe && !budgetFrame) {
    return null;
  }

  return (
    <div className="mt-1.5 flex items-start justify-between gap-2">
      <p className="text-[13px] text-text-muted">
        {timeframe && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {timeframe}
          </span>
        )}
        {timeframe && budgetFrame && (
          <span className="mx-1.5 text-border" aria-hidden>
            ·
          </span>
        )}
        {budgetFrame && (
          <span className="inline-flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {budgetFrame}
          </span>
        )}
      </p>
      {!readOnly && onSave && (
        <button
          type="button"
          onClick={() => {
            setDraftTimeframe(timeframe ?? "");
            setDraftBudgetFrame(budgetFrame ?? "");
            setIsEditing(true);
          }}
          aria-label="Umsetzungsrahmen bearbeiten"
          className="shrink-0 rounded p-1 text-text-muted transition-colors hover:text-accent"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
