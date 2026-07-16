"use client";

import type { StatementCategory } from "@prisma/client";
import { GitBranch } from "lucide-react";
import { StatementCard } from "@/components/statements/StatementCard";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
import { AddStatementForm } from "./AddStatementForm";
import { CompactStatementRow } from "./CompactStatementRow";
import type { StatementData } from "@/components/statements/types";

// Quadrant tints are deliberately neutral — the three evidence colors stay
// reserved for the badges (UI_KONZEPT color rule).
const QUADRANTS: {
  category: StatementCategory;
  label: string;
  tint: string;
}[] = [
  { category: "SWOT_STRENGTH", label: "Stärken", tint: "bg-[#F2F7F3]" },
  { category: "SWOT_WEAKNESS", label: "Schwächen", tint: "bg-[#F9F4F0]" },
  { category: "SWOT_OPPORTUNITY", label: "Chancen", tint: "bg-[#F1F6F8]" },
  { category: "SWOT_THREAT", label: "Risiken", tint: "bg-[#F8F2F4]" },
];

const ASPECT_TILE =
  "min-w-0 rounded-[8px] border border-border/55 bg-surface/95 px-3 py-2.5 shadow-[0_1px_0_rgba(31,36,33,0.03)]";

const SCROLL_MT =
  "scroll-mt-[20rem] sm:scroll-mt-[12rem] lg:scroll-mt-[9rem]";

function evidenceCounts(statements: StatementData[]) {
  return {
    facts: statements.filter((s) => s.evidenceStatus === "FACT").length,
    assumptions: statements.filter((s) => s.evidenceStatus === "ASSUMPTION")
      .length,
    open: statements.filter((s) => s.evidenceStatus === "OPEN_QUESTION").length,
  };
}

function MarketPathsCard({
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
    : "border border-border/80 bg-[#F1F6F8]";

  return (
    <article className={`overflow-hidden rounded-[10px] ${frameClasses}`}>
      <header className="border-b border-border/60 bg-surface/80 px-4 py-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted ring-1 ring-border">
            <GitBranch className="h-3.5 w-3.5" aria-hidden />
            Synthese
          </span>
          {hasDraft && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
              Entwurf
            </span>
          )}
        </div>
        <h4 className="font-heading text-base font-medium text-text">
          Erkennbare Marktpfade
        </h4>
        {statements.length > 0 && (
          <p className="mt-1 text-xs text-text-muted">
            Vorläufige Richtungen · {facts} Fakten · {assumptions} Annahmen ·{" "}
            {open} offen
          </p>
        )}
      </header>

      {statements.length === 0 ? (
        <p className="px-4 py-3 text-xs text-text-muted">
          Keine Marktpfade vorhanden.
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
          categories={[{ value: "MARKET_PATH", label: "Marktpfad" }]}
          onAdded={onAdded}
        />
      </div>
    </article>
  );
}

export function SwotMatrix({
  projectId,
  statements,
  marketPaths,
  onChanged,
  onDeleted,
  onAdded,
}: {
  projectId: string;
  statements: StatementData[];
  marketPaths: StatementData[];
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <CollapsibleSection
        id="swot"
        title="SWOT-Matrix"
        highlightUntilOpened
        className={SCROLL_MT}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {QUADRANTS.map((quadrant) => {
            const quadrantStatements = statements.filter(
              (statement) => statement.category === quadrant.category
            );
            return (
              <div
                key={quadrant.category}
                className={`flex flex-col gap-2 rounded-[10px] border border-border p-3 ${quadrant.tint}`}
              >
                <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {quadrant.label}
                </h4>
                {quadrantStatements.length === 0 && (
                  <p className="text-xs text-text-muted">Keine Aussagen.</p>
                )}
                {quadrantStatements.map((statement) => (
                  <StatementCard
                    key={statement.id}
                    statement={statement}
                    onChanged={onChanged}
                    onDeleted={onDeleted}
                  />
                ))}
                <AddStatementForm
                  projectId={projectId}
                  categories={[
                    { value: quadrant.category, label: quadrant.label },
                  ]}
                  onAdded={onAdded}
                />
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="marktpfade"
        title="Erkennbare Marktpfade"
        highlightUntilOpened
        className={SCROLL_MT}
      >
        <MarketPathsCard
          projectId={projectId}
          statements={marketPaths}
          onChanged={onChanged}
          onDeleted={onDeleted}
          onAdded={onAdded}
        />
      </CollapsibleSection>
    </div>
  );
}
