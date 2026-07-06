"use client";

import { StatementCard } from "@/components/statements/StatementCard";
import { AddStatementForm } from "./AddStatementForm";
import type { StatementData } from "@/components/statements/types";

export function CompetitorCards({
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
    <section id="wettbewerb" className="scroll-mt-6">
      <h3 className="font-heading text-base font-medium text-text">
        Wettbewerb & Alternativen
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {statements.length === 0 && (
          <p className="text-xs text-text-muted sm:col-span-2">
            Keine Wettbewerber-Aussagen vorhanden.
          </p>
        )}
        {statements.map((statement) => (
          <StatementCard
            key={statement.id}
            statement={statement}
            onChanged={onChanged}
            onDeleted={onDeleted}
          />
        ))}
      </div>
      <div className="mt-3">
        <AddStatementForm
          projectId={projectId}
          categories={[{ value: "COMPETITOR", label: "Wettbewerber" }]}
          onAdded={onAdded}
        />
      </div>
    </section>
  );
}
