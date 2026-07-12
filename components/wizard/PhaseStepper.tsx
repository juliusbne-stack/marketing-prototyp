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
// .cursorrules rule 5); phase 5 unlocks from the cockpit footer.
export function PhaseStepper({
  projectId,
  currentPhase,
  cockpitUnlocked,
}: {
  projectId: string;
  currentPhase: number;
  cockpitUnlocked: boolean;
}) {
  const params = useParams<{ n: string }>();
  const pathname = usePathname();
  const isCockpitActive = pathname?.endsWith("/cockpit") ?? false;
  const activePhase = isCockpitActive ? 0 : Number(params.n) || 1;

  function renderPhaseRow(phase: (typeof PHASES)[number]) {
    const isActive = phase.number === activePhase;
    const isUnlocked = phase.number <= currentPhase;
    const isCompleted = phase.number < currentPhase;
    const isLocked = !isUnlocked;

    const rowClasses = `group grid min-h-[58px] grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all ${
      isActive
        ? "min-h-[86px] border-accent bg-[#f8ffff] text-accent shadow-[0_10px_24px_rgba(14,90,99,0.08)]"
        : isLocked
          ? "border-transparent bg-surface/45 text-text-muted/55"
          : "border-transparent bg-surface/75 text-text-muted shadow-[0_1px_0_rgba(31,36,33,0.02)]"
    }`;

    const marker = (
      <span
        aria-hidden
        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
          isActive
            ? "border-accent bg-surface text-accent"
            : isCompleted
              ? "border-accent/80 bg-surface text-accent"
              : "border-border bg-surface text-text-muted/55"
        }`}
      >
        {isCompleted && !isActive ? (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        ) : (
          <span
            className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${
              isActive
                ? "border border-accent text-accent"
                : "border border-border text-text-muted/65"
            }`}
          >
            {phase.number}
          </span>
        )}
      </span>
    );

    const phaseLabel = (
      <span className="min-w-0">
        <span
          className={`block font-heading text-[10px] font-semibold uppercase tracking-[0.18em] ${
            isLocked ? "text-text-muted/45" : "text-text-muted/55"
          }`}
        >
          Phase {String(phase.number).padStart(2, "0")}
        </span>
        <span
          className={`mt-0.5 block truncate font-heading text-sm font-semibold ${
            isActive ? "text-text" : "text-inherit"
          }`}
        >
          {phase.title}
        </span>
      </span>
    );

    const trailingSpacer = <span aria-hidden className="w-7" />;

    const lockedHint =
      phase.number === 5
        ? "Noch gesperrt - schliesse die Umsetzung im Cockpit ab und gehe ueber 'Weiter zu Phase 5: Lernen'."
        : "Noch gesperrt - schliesse zuerst die vorherige Phase ueber 'Weiter zu Phase ...' ab.";

    if (isUnlocked) {
      return (
        <Link
          href={`/project/${projectId}/phase/${phase.number}`}
          aria-current={isActive ? "step" : undefined}
          className={`${rowClasses} ${
            isActive
              ? ""
              : "hover:border-accent/20 hover:bg-surface hover:text-accent hover:shadow-[0_8px_18px_rgba(14,90,99,0.06)]"
          }`}
        >
          {marker}
          {phaseLabel}
          {trailingSpacer}
        </Link>
      );
    }

    return (
      <div
        aria-disabled="true"
        title={lockedHint}
        className={`${rowClasses} cursor-not-allowed opacity-50`}
      >
        {marker}
        {phaseLabel}
        {trailingSpacer}
      </div>
    );
  }

  function renderCockpitEntry() {
    const cockpitRowClasses = `grid min-h-[52px] grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all md:ml-4 ${
      isCockpitActive
        ? "border-accent bg-[#f8ffff] text-accent shadow-[0_10px_24px_rgba(14,90,99,0.08)]"
        : cockpitUnlocked
          ? "border-transparent bg-surface/65 text-text-muted"
          : "border-transparent bg-surface/35 text-text-muted/55"
    }`;
    const cockpitMarker = (
      <span
        aria-hidden
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
          isCockpitActive
            ? "border-accent bg-surface text-accent"
            : "border-border bg-surface text-text-muted/65"
        }`}
      >
        <Gauge className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );

    const cockpitLabel = (
      <span className="min-w-0">
        <span
          className={`block font-heading text-[10px] font-semibold uppercase tracking-[0.18em] ${
            cockpitUnlocked ? "text-text-muted/55" : "text-text-muted/45"
          }`}
        >
          Cockpit
        </span>
        <span
          className={`mt-0.5 block truncate font-heading text-sm font-semibold ${
            isCockpitActive ? "text-text" : "text-inherit"
          }`}
        >
          Umsetzung
        </span>
      </span>
    );

    if (cockpitUnlocked) {
      return (
        <Link
          href={`/project/${projectId}/cockpit`}
          aria-current={isCockpitActive ? "step" : undefined}
          className={`${cockpitRowClasses} ${
            isCockpitActive
              ? ""
              : "hover:border-accent/20 hover:bg-surface hover:text-accent hover:shadow-[0_8px_18px_rgba(14,90,99,0.06)]"
          }`}
        >
          {cockpitMarker}
          {cockpitLabel}
        </Link>
      );
    }

    return (
      <div
        aria-disabled="true"
        title="Verfuegbar, sobald in Phase 4 mindestens ein Umsetzungsschritt uebernommen ist."
        className={`${cockpitRowClasses} cursor-not-allowed opacity-50`}
      >
        {cockpitMarker}
        {cockpitLabel}
      </div>
    );
  }

  return (
    <nav
      aria-label="Phasen"
      className="w-full rounded-2xl bg-[#f3f6f8] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_44px_rgba(31,36,33,0.06)] ring-1 ring-border/45 md:sticky md:top-6 md:w-[260px] md:shrink-0 md:self-start"
    >
      <div className="mb-4 hidden md:block">
        <h2 className="font-heading text-lg font-semibold leading-tight text-text">
          Strategie-Phasen
        </h2>
        <p className="mt-0.5 text-[11px] font-medium text-text-muted">
          Marketing-Cockpit
        </p>
      </div>
      <ol className="flex flex-row gap-2 overflow-x-auto pb-1 md:flex-col md:gap-2 md:overflow-visible md:pb-0">
        {PHASES.map((phase) => (
          <li key={phase.number} className="w-[190px] shrink-0 md:w-full">
            {phase.number === 5 && (
              <div className="hidden flex-col md:flex">
                <div aria-hidden className="mx-7 h-2 border-l border-border" />
                {renderCockpitEntry()}
                <div aria-hidden className="mx-7 h-2 border-l border-border" />
              </div>
            )}
            {renderPhaseRow(phase)}
          </li>
        ))}
        {/* Mobile: cockpit after phase 5 in the horizontal strip */}
        <li className="w-[190px] shrink-0 md:hidden">{renderCockpitEntry()}</li>
      </ol>
    </nav>
  );
}
