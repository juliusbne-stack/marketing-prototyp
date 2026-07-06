"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Check } from "lucide-react";

export const PHASES = [
  { number: 1, title: "Analyse", fullTitle: "Situationsanalyse" },
  { number: 2, title: "Optionen", fullTitle: "Strategieoptionen" },
  { number: 3, title: "Bewertung", fullTitle: "Bewertung & Priorisierung" },
  { number: 4, title: "Umsetzung", fullTitle: "Validierende Umsetzung" },
  { number: 5, title: "Lernen", fullTitle: "Lernen & Anpassung" },
] as const;

// Phases up to project.currentPhase are reachable (including back-jumps,
// .cursorrules rule 5); later phases stay locked until the user completes
// the preceding phase via the "Weiter zu Phase X" button.
export function PhaseStepper({
  projectId,
  currentPhase,
}: {
  projectId: string;
  currentPhase: number;
}) {
  const params = useParams<{ n: string }>();
  const activePhase = Number(params.n) || 1;

  return (
    <nav aria-label="Phasen" className="w-full md:w-[240px] md:shrink-0">
      <ol className="flex flex-row gap-1 overflow-x-auto md:flex-col">
        {PHASES.map((phase) => {
          const isActive = phase.number === activePhase;
          const isUnlocked = phase.number <= currentPhase;
          const isCompleted = phase.number < currentPhase;

          const rowClasses = `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
            isActive
              ? "bg-accent-soft font-medium text-accent"
              : "text-text-muted"
          }`;

          const marker = (
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                isActive
                  ? "border-accent bg-accent text-white"
                  : isCompleted
                    ? "border-evidence-fact-border bg-evidence-fact-bg text-evidence-fact-text"
                    : "border-border bg-surface"
              }`}
            >
              {isCompleted && !isActive ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : (
                phase.number
              )}
            </span>
          );

          return (
            <li key={phase.number} className="shrink-0">
              {isUnlocked ? (
                <Link
                  href={`/project/${projectId}/phase/${phase.number}`}
                  aria-current={isActive ? "step" : undefined}
                  className={`${rowClasses} transition-colors ${
                    isActive ? "" : "hover:bg-accent-soft/50 hover:text-accent"
                  }`}
                >
                  {marker}
                  <span className="whitespace-nowrap">{phase.title}</span>
                </Link>
              ) : (
                <div
                  aria-disabled
                  title="Noch gesperrt — schließe zuerst die vorherige Phase ab."
                  className={`${rowClasses} cursor-not-allowed opacity-60`}
                >
                  {marker}
                  <span className="whitespace-nowrap">{phase.title}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
