"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Check, Gauge } from "lucide-react";

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
  cockpitUnlocked,
}: {
  projectId: string;
  currentPhase: number;
  // The implementation cockpit unlocks with the first adopted validation step.
  cockpitUnlocked: boolean;
}) {
  const params = useParams<{ n: string }>();
  const pathname = usePathname();
  const isCockpitActive = pathname?.endsWith("/cockpit") ?? false;
  const activePhase = isCockpitActive ? 0 : Number(params.n) || 1;

  return (
    <nav aria-label="Phasen" className="w-full md:w-[240px] md:shrink-0">
      <ol className="flex flex-row gap-1 overflow-x-auto md:flex-col">
        {PHASES.map((phase) => {
          const isActive = phase.number === activePhase;
          const isUnlocked = phase.number <= currentPhase;
          const isCompleted = phase.number < currentPhase;
          const isLocked = !isUnlocked;

          const rowClasses = `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
            isActive
              ? "bg-accent-soft font-medium text-accent"
              : isLocked
                ? "text-text-muted/70"
                : "text-text-muted"
          }`;

          const marker = (
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${
                isActive
                  ? "border-accent bg-accent text-white"
                  : isCompleted
                    ? "border-evidence-fact-border bg-evidence-fact-bg text-evidence-fact-text"
                    : "border-border bg-background text-text-muted"
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
                  aria-disabled="true"
                  title="Noch gesperrt — schließe zuerst die vorherige Phase über „Weiter zu Phase …“ ab."
                  className={`${rowClasses} cursor-not-allowed opacity-50`}
                >
                  {marker}
                  <span className="whitespace-nowrap">{phase.title}</span>
                </div>
              )}
            </li>
          );
        })}

        {/* Separated entry: companion view for the implementation period
            between phase 4 and 5, unlocked with the first adopted step. */}
        <li className="shrink-0 md:mt-2 md:border-t md:border-border md:pt-2">
          {(() => {
            const cockpitRowClasses = `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${
              isCockpitActive
                ? "bg-accent-soft font-medium text-accent"
                : cockpitUnlocked
                  ? "text-text-muted"
                  : "text-text-muted/70"
            }`;
            const cockpitMarker = (
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  isCockpitActive
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-background text-text-muted"
                }`}
              >
                <Gauge className="h-3 w-3" strokeWidth={2.5} />
              </span>
            );

            return cockpitUnlocked ? (
              <Link
                href={`/project/${projectId}/cockpit`}
                aria-current={isCockpitActive ? "step" : undefined}
                className={`${cockpitRowClasses} transition-colors ${
                  isCockpitActive
                    ? ""
                    : "hover:bg-accent-soft/50 hover:text-accent"
                }`}
              >
                {cockpitMarker}
                <span className="whitespace-nowrap">Umsetzungs-Cockpit</span>
              </Link>
            ) : (
              <div
                aria-disabled="true"
                title="Verfügbar, sobald in Phase 4 mindestens ein Umsetzungsschritt übernommen ist."
                className={`${cockpitRowClasses} cursor-not-allowed opacity-50`}
              >
                {cockpitMarker}
                <span className="whitespace-nowrap">Umsetzungs-Cockpit</span>
              </div>
            );
          })()}
        </li>
      </ol>
    </nav>
  );
}
