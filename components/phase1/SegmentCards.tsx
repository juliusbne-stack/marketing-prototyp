"use client";

import { StatementCard } from "@/components/statements/StatementCard";
import { AddStatementForm } from "./AddStatementForm";
import type { StatementData } from "@/components/statements/types";

export function SegmentCards({
  projectId,
  segments,
  problems,
  onChanged,
  onDeleted,
  onAdded,
}: {
  projectId: string;
  segments: StatementData[];
  problems: StatementData[];
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
}) {
  return (
    <section id="zielgruppen" className="scroll-mt-6">
      <h3 className="font-heading text-base font-medium text-text">
        Zielgruppen & Kundenprobleme
      </h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {segments.length === 0 && (
          <p className="text-xs text-text-muted sm:col-span-2">
            Keine Zielgruppenhypothesen vorhanden.
          </p>
        )}
        {segments.map((statement) => (
          <StatementCard
            key={statement.id}
            statement={statement}
            onChanged={onChanged}
            onDeleted={onDeleted}
          />
        ))}
      </div>

      <h4 className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted">
        Kundenprobleme
      </h4>
      <div className="mt-2 flex flex-col gap-3">
        {problems.length === 0 && (
          <p className="text-xs text-text-muted">
            Keine Aussagen zu Kundenproblemen vorhanden.
          </p>
        )}
        {problems.map((statement) => (
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
          categories={[
            { value: "TARGET_SEGMENT", label: "Zielgruppe" },
            { value: "CUSTOMER_PROBLEM", label: "Kundenproblem" },
          ]}
          onAdded={onAdded}
        />
      </div>
    </section>
  );
}
