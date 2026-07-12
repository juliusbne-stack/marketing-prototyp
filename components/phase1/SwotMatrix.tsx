"use client";

import type { StatementCategory } from "@prisma/client";
import { StatementCard } from "@/components/statements/StatementCard";
import { AddStatementForm } from "./AddStatementForm";
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
    <section
      id="swot"
      className="scroll-mt-[20rem] sm:scroll-mt-[12rem] lg:scroll-mt-[9rem]"
    >
      <h3 className="font-heading text-base font-medium text-text">
        SWOT-Matrix
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
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

      <h4 className="mt-6 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Erkennbare Marktpfade
      </h4>
      <div className="mt-2 flex flex-col gap-3">
        {marketPaths.length === 0 && (
          <p className="text-xs text-text-muted">
            Keine Marktpfade vorhanden.
          </p>
        )}
        {marketPaths.map((statement) => (
          <StatementCard
            key={statement.id}
            statement={statement}
            onChanged={onChanged}
            onDeleted={onDeleted}
          />
        ))}
        <AddStatementForm
          projectId={projectId}
          categories={[{ value: "MARKET_PATH", label: "Marktpfad" }]}
          onAdded={onAdded}
        />
      </div>
    </section>
  );
}
