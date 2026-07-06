"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import {
  CRITERION_ORDER,
  type EvaluatedOption,
  type EvaluationData,
} from "./types";

function ScoreCell({
  score,
  rationale,
  optionTitle,
  criterionLabel,
}: {
  score: number;
  rationale: string;
  optionTitle: string;
  criterionLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <div
        role="img"
        aria-label={`${score} von 5 Punkten`}
        className="flex gap-1"
      >
        {[1, 2, 3, 4, 5].map((step) => (
          <span
            key={step}
            aria-hidden
            className={`h-2 w-2 rounded-full ${
              step <= score ? "bg-accent" : "bg-border"
            }`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`Begründung für ${criterionLabel} bei ${optionTitle} anzeigen`}
        className="rounded p-0.5 text-text-muted transition-colors hover:text-accent"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-border bg-surface p-3 text-left text-xs leading-relaxed text-text shadow-sm">
          <p className="mb-1 font-medium">
            {criterionLabel} — Score {score}/5
          </p>
          <p className="text-text-muted">{rationale}</p>
        </div>
      )}
    </div>
  );
}

export function EvaluationMatrix({
  options,
  evaluations,
}: {
  options: EvaluatedOption[];
  evaluations: EvaluationData[];
}) {
  return (
    <section aria-label="Bewertungsmatrix">
      <h3 className="font-heading text-base font-medium text-text">
        Bewertungsmatrix
      </h3>
      <p className="mt-1 text-xs text-text-muted">
        Sechs Kriterien je Option, Score 1–5 (5 = am besten). Das Info-Symbol
        zeigt die Begründung der KI.
      </p>
      <div className="mt-3 overflow-x-auto rounded-[10px] border border-border bg-surface">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Kriterium
              </th>
              {options.map((option) => (
                <th
                  scope="col"
                  key={option.id}
                  className="px-4 py-3 text-left font-heading text-sm font-medium text-text"
                >
                  {option.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRITERION_ORDER.map(({ criterion, label }, rowIndex) => (
              <tr
                key={criterion}
                className={
                  rowIndex < CRITERION_ORDER.length - 1
                    ? "border-b border-border/70"
                    : ""
                }
              >
                <th
                  scope="row"
                  className="px-4 py-3 text-left text-sm font-medium text-text"
                >
                  {label}
                </th>
                {options.map((option) => {
                  const evaluation = evaluations.find(
                    (candidate) =>
                      candidate.optionId === option.id &&
                      candidate.criterion === criterion
                  );
                  return (
                    <td key={option.id} className="px-4 py-3">
                      {evaluation ? (
                        <ScoreCell
                          score={evaluation.score}
                          rationale={evaluation.rationale}
                          optionTitle={option.title}
                          criterionLabel={label}
                        />
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
