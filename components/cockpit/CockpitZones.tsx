"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CockpitStepCard } from "./CockpitStepCard";
import { CockpitStepCompactRow } from "./CockpitStepCompactRow";
import type { CockpitStepData } from "./types";

export function CockpitZones({
  projectId,
  focusStep,
  focusReason,
  otherActiveSteps,
  completedSteps,
}: {
  projectId: string;
  focusStep: CockpitStepData | null;
  focusReason: string | null;
  otherActiveSteps: CockpitStepData[];
  completedSteps: CockpitStepData[];
}) {
  const [completedOpen, setCompletedOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      {focusStep && (
        <section aria-label="Jetzt dran">
          <h3 className="font-heading text-base font-medium text-text">
            Jetzt dran
          </h3>
          {focusReason && (
            <p className="mt-1 text-[13px] text-text-muted">{focusReason}</p>
          )}
          <div className="mt-3">
            <CockpitStepCard
              projectId={projectId}
              step={focusStep}
              highlightNextTask
            />
          </div>
        </section>
      )}

      {otherActiveSteps.length > 0 && (
        <section aria-label="Weitere aktive Schritte">
          <h3 className="font-heading text-base font-medium text-text">
            Weitere aktive Schritte
          </h3>
          <div className="mt-3 flex flex-col gap-2">
            {otherActiveSteps.map((step) => (
              <CockpitStepCompactRow
                key={step.id}
                projectId={projectId}
                step={step}
              />
            ))}
          </div>
        </section>
      )}

      {completedSteps.length > 0 && (
        <section aria-label="Abgeschlossen">
          <button
            type="button"
            onClick={() => setCompletedOpen((current) => !current)}
            aria-expanded={completedOpen}
            className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-background"
          >
            <span className="font-heading text-base font-medium text-text">
              Abgeschlossen
              <span className="ml-2 text-sm font-normal text-text-muted">
                ({completedSteps.length})
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${
                completedOpen ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>

          {completedOpen && (
            <div className="mt-2 flex flex-col gap-2">
              {completedSteps.map((step) => (
                <CockpitStepCompactRow
                  key={step.id}
                  projectId={projectId}
                  step={step}
                  readOnly
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
