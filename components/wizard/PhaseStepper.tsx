"use client";

import { useParams } from "next/navigation";

export const PHASES = [
  { number: 1, title: "Analyse", fullTitle: "Situationsanalyse" },
  { number: 2, title: "Optionen", fullTitle: "Strategieoptionen" },
  { number: 3, title: "Bewertung", fullTitle: "Bewertung & Priorisierung" },
  { number: 4, title: "Umsetzung", fullTitle: "Validierende Umsetzung" },
  { number: 5, title: "Lernen", fullTitle: "Lernen & Anpassung" },
] as const;

// M1: static stepper — the phase from the URL is active, all others are
// locked. Dynamic status (completed/unlocked) follows in a later milestone.
export function PhaseStepper() {
  const params = useParams<{ n: string }>();
  const activePhase = Number(params.n) || 1;

  return (
    <nav aria-label="Phasen" className="w-full md:w-[240px] md:shrink-0">
      <ol className="flex flex-row gap-1 overflow-x-auto md:flex-col">
        {PHASES.map((phase) => {
          const isActive = phase.number === activePhase;
          return (
            <li key={phase.number} className="shrink-0">
              <div
                aria-current={isActive ? "step" : undefined}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-text-muted"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                    isActive
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-surface"
                  }`}
                >
                  {phase.number}
                </span>
                <span className="whitespace-nowrap">{phase.title}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
