"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { StatementCard } from "@/components/statements/StatementCard";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
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

function RelevantPestelCell({
  projectId,
  label,
  category,
  entry,
  statements,
  defaultOpen = false,
  onChanged,
  onDeleted,
  onAdded,
}: {
  projectId: string;
  label: string;
  category: PestelCategory;
  entry: PestelRelevance | undefined;
  statements: StatementData[];
  defaultOpen?: boolean;
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-background/60">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors duration-200 hover:bg-accent-soft/35 sm:px-4"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <h4 className="min-w-0 text-xs font-semibold uppercase tracking-wide text-text transition-colors group-hover:text-accent">
            {label}
          </h4>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-evidence-fact-bg px-2 py-0.5 text-[10px] font-medium text-evidence-fact-text">
            Relevant
          </span>
          {!isOpen && (
            <span className="shrink-0 text-[11px] text-text-muted">
              {statements.length === 0
                ? "Keine Aussagen"
                : `${statements.length} Aussage${statements.length === 1 ? "" : "n"}`}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-[transform,color] duration-200 group-hover:text-accent motion-reduce:transition-none ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2.5 border-t border-border/60 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
          {entry && <RelevanceNote entry={entry} />}

          {statements.length === 0 && (
            <p className="text-xs text-text-muted">Keine Aussagen.</p>
          )}
          {statements.map((statement) => (
            <StatementCard
              key={statement.id}
              statement={statement}
              onChanged={onChanged}
              onDeleted={onDeleted}
            />
          ))}
          <AddStatementForm
            projectId={projectId}
            categories={[{ value: category, label }]}
            onAdded={onAdded}
          />
        </div>
      )}
    </div>
  );
}

function DeprioritizedPestelCell({
  label,
  entry,
}: {
  label: string;
  entry: PestelRelevance | undefined;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-[10px] border border-dashed border-border/80 bg-background/30">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left sm:px-4"
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <h4 className="min-w-0 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </h4>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-text-muted">
            Aktuell nachrangig
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2.5 border-t border-border/60 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4">
          {entry && <RelevanceNote entry={entry} defaultOpen />}
          <p className="text-xs leading-relaxed text-text-muted">
            Bewusst keine Aussage — die KI hat diese Dimension als strategisch
            nachrangig eingestuft.
          </p>
        </div>
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

  const relevantFields = PESTEL_FIELDS.filter((field) => {
    const entry = relevanceByCategory.get(field.category);
    return entry?.relevant ?? true;
  });

  const deprioritizedFields = PESTEL_FIELDS.filter((field) => {
    const entry = relevanceByCategory.get(field.category);
    return entry != null && !entry.relevant;
  });

  return (
    <CollapsibleSection
      id="pestel"
      title="PESTEL-Umfeld"
      defaultOpen
      className="scroll-mt-[20rem] sm:scroll-mt-[12rem] lg:scroll-mt-[9rem]"
      intro="Die KI bewertet zuerst, welche Umfelddimensionen für dein Geschäftsmodell strategisch relevant sind — nicht alle sechs müssen Aussagen erhalten."
    >
      <div className="flex flex-col gap-3">
        {relevantFields.map((field, index) => {
          const entry = relevanceByCategory.get(field.category);
          const cellStatements = statements.filter(
            (statement) => statement.category === field.category
          );

          return (
            <RelevantPestelCell
              key={field.category}
              projectId={projectId}
              label={field.label}
              category={field.category}
              entry={entry}
              statements={cellStatements}
              defaultOpen={index === 0}
              onChanged={onChanged}
              onDeleted={onDeleted}
              onAdded={onAdded}
            />
          );
        })}
      </div>

      {deprioritizedFields.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {deprioritizedFields.map((field) => (
            <DeprioritizedPestelCell
              key={field.category}
              label={field.label}
              entry={relevanceByCategory.get(field.category)}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}
