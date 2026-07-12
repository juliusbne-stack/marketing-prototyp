"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { StatementCard } from "@/components/statements/StatementCard";
import { AddStatementForm } from "./AddStatementForm";
import type { StatementData } from "@/components/statements/types";
import type { PestelCategory, PestelRelevance } from "@/lib/schemas/phase1";

const PESTEL_FIELDS: { category: PestelCategory; label: string }[] = [
  { category: "PESTEL_POLITICAL", label: "Politisch" },
  { category: "PESTEL_ECONOMIC", label: "Ökonomisch" },
  { category: "PESTEL_SOCIAL", label: "Sozial" },
  { category: "PESTEL_TECHNOLOGICAL", label: "Technologisch" },
  { category: "PESTEL_ECOLOGICAL", label: "Ökologisch" },
  { category: "PESTEL_LEGAL", label: "Rechtlich" },
];

function RelevanceNote({
  entry,
  defaultOpen = false,
}: {
  entry: PestelRelevance;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border border-border/80 bg-background/40">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="min-w-0 truncate text-xs text-text-muted">
          {entry.relevant
            ? "Warum diese Dimension relevant ist"
            : "Warum diese Dimension nachrangig ist"}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {isOpen && (
        <p className="border-t border-border/80 px-3 py-2 text-xs leading-relaxed text-text-muted">
          {entry.relevanceJustification}
        </p>
      )}
    </div>
  );
}

export function PestelGrid({
  projectId,
  statements,
  pestelRelevance,
  onChanged,
  onDeleted,
  onAdded,
}: {
  projectId: string;
  statements: StatementData[];
  pestelRelevance: PestelRelevance[];
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
}) {
  const relevanceByCategory = new Map(
    pestelRelevance.map((entry) => [entry.category, entry])
  );

  return (
    <section
      id="pestel"
      className="scroll-mt-[20rem] sm:scroll-mt-[12rem] lg:scroll-mt-[9rem]"
    >
      <h3 className="font-heading text-base font-medium text-text">
        PESTEL-Umfeld
      </h3>
      <p className="mt-1 text-xs text-text-muted">
        Die KI bewertet zuerst, welche Umfelddimensionen für dein Geschäftsmodell
        strategisch relevant sind — nicht alle sechs müssen Aussagen erhalten.
      </p>
      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,19rem),1fr))] gap-4 xl:gap-5">
        {PESTEL_FIELDS.map((field) => {
          const entry = relevanceByCategory.get(field.category);
          const isRelevant = entry?.relevant ?? true;
          const cellStatements = statements.filter(
            (statement) => statement.category === field.category
          );

          return (
            <div
              key={field.category}
              className={`flex min-w-0 flex-col gap-2.5 rounded-[10px] border p-3.5 sm:p-4 ${
                isRelevant
                  ? "border-border bg-background/60"
                  : "border-dashed border-border/80 bg-background/30"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                <h4
                  className={`min-w-0 text-xs font-semibold uppercase tracking-wide ${
                    isRelevant ? "text-text" : "text-text-muted"
                  }`}
                >
                  {field.label}
                </h4>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isRelevant
                      ? "bg-evidence-fact-bg text-evidence-fact-text"
                      : "bg-background text-text-muted"
                  }`}
                >
                  {isRelevant ? "Relevant" : "Aktuell nachrangig"}
                </span>
              </div>

              {entry && <RelevanceNote entry={entry} defaultOpen={!isRelevant} />}

              {isRelevant ? (
                <>
                  {cellStatements.length === 0 && (
                    <p className="text-xs text-text-muted">Keine Aussagen.</p>
                  )}
                  {cellStatements.map((statement) => (
                    <StatementCard
                      key={statement.id}
                      statement={statement}
                      onChanged={onChanged}
                      onDeleted={onDeleted}
                    />
                  ))}
                  <AddStatementForm
                    projectId={projectId}
                    categories={[{ value: field.category, label: field.label }]}
                    onAdded={onAdded}
                  />
                </>
              ) : (
                <p className="text-xs leading-relaxed text-text-muted">
                  Bewusst keine Aussage — die KI hat diese Dimension als
                  strategisch nachrangig eingestuft.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
