"use client";

import type { StatementCategory } from "@prisma/client";
import { StatementCard } from "@/components/statements/StatementCard";
import { AddStatementForm } from "./AddStatementForm";
import type { StatementData } from "@/components/statements/types";

const PESTEL_FIELDS: { category: StatementCategory; label: string }[] = [
  { category: "PESTEL_POLITICAL", label: "Politisch" },
  { category: "PESTEL_ECONOMIC", label: "Ökonomisch" },
  { category: "PESTEL_SOCIAL", label: "Sozial" },
  { category: "PESTEL_TECHNOLOGICAL", label: "Technologisch" },
  { category: "PESTEL_ECOLOGICAL", label: "Ökologisch" },
  { category: "PESTEL_LEGAL", label: "Rechtlich" },
];

export function PestelGrid({
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
    <section id="pestel" className="scroll-mt-6">
      <h3 className="font-heading text-base font-medium text-text">
        PESTEL-Umfeld
      </h3>
      <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PESTEL_FIELDS.map((field) => {
          const cellStatements = statements.filter(
            (statement) => statement.category === field.category
          );
          return (
            <div
              key={field.category}
              className="flex flex-col gap-2 rounded-[10px] border border-border bg-background/60 p-3"
            >
              <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                {field.label}
              </h4>
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
