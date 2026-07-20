"use client";

import { Boxes } from "lucide-react";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
import type { StatementData } from "@/components/statements/types";
import { AddStatementForm } from "./AddStatementForm";
import { CompactStatementRow } from "./CompactStatementRow";

function evidenceCounts(statements: StatementData[]) {
  return {
    facts: statements.filter((s) => s.evidenceStatus === "FACT").length,
    assumptions: statements.filter((s) => s.evidenceStatus === "ASSUMPTION")
      .length,
    open: statements.filter((s) => s.evidenceStatus === "OPEN_QUESTION").length,
  };
}

const ASPECT_TILE =
  "min-w-0 rounded-[8px] border border-border/55 bg-surface/95 px-3 py-2.5 shadow-[0_1px_0_rgba(31,36,33,0.03)]";

function ResourcesCard({
  projectId,
  statements,
  onChanged,
  onDeleted,
  onAdded,
}: {
  projectId: string;
  statements: StatementData[];
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
}) {
  const { facts, assumptions, open } = evidenceCounts(statements);
  const hasDraft = statements.some((statement) => !statement.adopted);

  const frameClasses = hasDraft
    ? "border border-dashed border-accent/50 bg-accent-soft/35"
    : "border border-border/80 bg-[#F3F6F4]";

  return (
    <article className={`overflow-hidden rounded-[10px] ${frameClasses}`}>
      <header className="border-b border-border/60 bg-surface/80 px-4 py-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted ring-1 ring-border">
            <Boxes className="h-3.5 w-3.5" aria-hidden />
            Intern
          </span>
          {hasDraft && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-deep">
              Entwurf
            </span>
          )}
        </div>
        <h4 className="font-heading text-base font-medium text-text">
          Ressourcen & Fähigkeiten
        </h4>
        {statements.length > 0 && (
          <p className="mt-1 text-xs text-text-muted">
            Aus dem Profil · {facts} Fakten · {assumptions} Annahmen · {open}{" "}
            offen
          </p>
        )}
      </header>

      {statements.length === 0 ? (
        <p className="px-4 py-3 text-xs text-text-muted">
          Keine Ressourcen-Aussagen vorhanden.
        </p>
      ) : (
        <div className="flex flex-col gap-2 p-3">
          {statements.map((statement) => (
            <div key={statement.id} className={ASPECT_TILE}>
              <CompactStatementRow
                statement={statement}
                showOriginInline
                showAdoptInline
                onChanged={onChanged}
                onDeleted={onDeleted}
              />
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border/60 bg-surface/50 px-4 py-3">
        <AddStatementForm
          projectId={projectId}
          categories={[{ value: "RESOURCE", label: "Ressource" }]}
          onAdded={onAdded}
        />
      </div>
    </article>
  );
}

export function ResourceCards({
  projectId,
  statements,
  onChanged,
  onDeleted,
  onAdded,
}: {
  projectId: string;
  statements: StatementData[];
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
}) {
  return (
    <CollapsibleSection
      id="ressourcen"
      title="Ressourcen & Fähigkeiten"
      highlightUntilOpened
      className="scroll-mt-[20rem] sm:scroll-mt-[12rem] lg:scroll-mt-[9rem]"
    >
      <ResourcesCard
        projectId={projectId}
        statements={statements}
        onChanged={onChanged}
        onDeleted={onDeleted}
        onAdded={onAdded}
      />
    </CollapsibleSection>
  );
}
