"use client";

import { useEffect, useRef, useState } from "react";
import { Check, MoreVertical, Plus } from "lucide-react";
import { StatementCard } from "@/components/statements/StatementCard";
import type { StatementData } from "@/components/statements/types";
import type { ValidationHistoryCounts } from "@/lib/validation";
import {
  SEGMENT_ASPECTS,
  SEGMENT_ASPECT_LABELS,
  isSegmentAspect,
  type SegmentAspect,
} from "@/lib/segmentAspects";
import { AddSegmentAspectForm } from "./AddSegmentAspectForm";
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

function SegmentProfileCard({
  projectId,
  segmentLabel,
  statements,
  onChanged,
  onDeleted,
  onAdded,
  layout = "vertical",
}: {
  projectId: string;
  segmentLabel: string;
  statements: StatementData[];
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
  layout?: "vertical" | "horizontal";
}) {
  const { facts, assumptions, open } = evidenceCounts(statements);
  const hasDraft = statements.some((statement) => !statement.adopted);
  const [isAdopting, setIsAdopting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aspectFormOpen, setAspectFormOpen] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const existingAspects = statements
    .map((statement) => statement.segmentAspect)
    .filter((aspect): aspect is SegmentAspect => !!aspect && isSegmentAspect(aspect));
  const canAddAspect = existingAspects.length < SEGMENT_ASPECTS.length;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const frameClasses = hasDraft
    ? "border border-dashed border-accent/50 bg-accent-soft/30"
    : "border border-border bg-surface";

  async function adoptProfile() {
    const drafts = statements.filter((statement) => !statement.adopted);
    if (drafts.length === 0) return;

    setIsAdopting(true);
    setAdoptError(null);
    try {
      const results = await Promise.all(
        drafts.map(async (statement) => {
          const response = await fetch("/api/statements", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: statement.id, adopted: true }),
          });
          if (!response.ok) {
            throw new Error("Das Segmentprofil konnte nicht übernommen werden.");
          }
          return (await response.json()) as StatementData;
        })
      );
      results.forEach(onChanged);
    } catch (err) {
      setAdoptError(
        err instanceof Error
          ? err.message
          : "Das Segmentprofil konnte nicht übernommen werden."
      );
    } finally {
      setIsAdopting(false);
    }
  }

  return (
    <article className={`rounded-[10px] p-4 ${frameClasses}`}>
      <header className="border-b border-border/70 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-heading text-base font-medium text-text">
              {segmentLabel}
            </h4>
            <p className="mt-1 text-xs text-text-muted">
              {facts} Fakten · {assumptions} Annahmen · {open} offen
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {canAddAspect && (
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Profilaktionen"
                  className="rounded p-1 text-text-muted transition-colors hover:text-accent"
                >
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </button>
                {menuOpen && (
                  <ul
                    role="menu"
                    className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-border bg-surface py-1 shadow-sm"
                  >
                    <li role="none">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setMenuOpen(false);
                          setAspectFormOpen(true);
                        }}
                        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-text hover:bg-accent-soft"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Aspekt ergänzen
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            )}

            {hasDraft && (
              <button
                type="button"
                onClick={adoptProfile}
                disabled={isAdopting}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                {isAdopting ? "Wird übernommen …" : "Profil übernehmen"}
              </button>
            )}
          </div>
        </div>

        {aspectFormOpen && (
          <div className="mt-3">
            <AddSegmentAspectForm
              projectId={projectId}
              segmentLabel={segmentLabel}
              existingAspects={existingAspects}
              onAdded={(statement) => {
                onAdded(statement);
                setAspectFormOpen(false);
              }}
              open={aspectFormOpen}
              onOpenChange={setAspectFormOpen}
              hideTrigger
            />
          </div>
        )}

        {adoptError && (
          <p className="mt-2 text-xs text-danger-text">{adoptError}</p>
        )}
      </header>

      <div
        className={
          layout === "horizontal"
            ? "mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2"
            : "divide-y divide-border/70"
        }
      >
        {SEGMENT_ASPECTS.map((aspect) => {
          const statement = statements.find(
            (candidate) => candidate.segmentAspect === aspect
          );

          const rowProps = {
            statement,
            aspectLabel: SEGMENT_ASPECT_LABELS[aspect],
            onChanged,
            onDeleted,
            emptyPlaceholder: "Noch keine Aussage zu dieser Dimension.",
          };

          if (layout === "horizontal") {
            return (
              <div
                key={aspect}
                className={`min-w-0 rounded-md border border-border/60 bg-background/60 p-3 ${
                  aspect === "DESCRIPTION" ? "sm:col-span-2" : ""
                }`}
              >
                <CompactStatementRow {...rowProps} layout="column" />
              </div>
            );
          }

          return <CompactStatementRow key={aspect} {...rowProps} layout="row" />;
        })}
      </div>
    </article>
  );
}

function CustomerProblemsCard({
  projectId,
  problems,
  onChanged,
  onDeleted,
  onAdded,
  validationHistoryByStatementId,
}: {
  projectId: string;
  problems: StatementData[];
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
  validationHistoryByStatementId?: Map<string, ValidationHistoryCounts>;
}) {
  const { facts, assumptions, open } = evidenceCounts(problems);
  const hasDraft = problems.some((statement) => !statement.adopted);

  const frameClasses = hasDraft
    ? "border border-dashed border-accent/50 bg-accent-soft/30"
    : "border border-border bg-surface";

  return (
    <article className={`mt-5 rounded-[10px] p-4 ${frameClasses}`}>
      <header className="border-b border-border/70 pb-3">
        <h4 className="font-heading text-base font-medium text-text">
          Kundenprobleme
        </h4>
        {problems.length > 0 && (
          <p className="mt-1 text-xs text-text-muted">
            {facts} Fakten · {assumptions} Annahmen · {open} offen
          </p>
        )}
      </header>

      {problems.length === 0 ? (
        <p className="py-3 text-xs text-text-muted">
          Keine Aussagen zu Kundenproblemen vorhanden.
        </p>
      ) : (
        <div className="divide-y divide-border/70">
          {problems.map((statement) => (
            <CompactStatementRow
              key={statement.id}
              statement={statement}
              showOriginInline
              showAdoptInline
              validationHistory={validationHistoryByStatementId?.get(statement.id)}
              onChanged={onChanged}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-border/70 pt-3">
        <AddStatementForm
          projectId={projectId}
          categories={[{ value: "CUSTOMER_PROBLEM", label: "Kundenproblem" }]}
          onAdded={onAdded}
        />
      </div>
    </article>
  );
}

export function SegmentCards({
  projectId,
  segments,
  problems,
  onChanged,
  onDeleted,
  onAdded,
  validationHistoryByStatementId,
}: {
  projectId: string;
  segments: StatementData[];
  problems: StatementData[];
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
  validationHistoryByStatementId?: Map<string, ValidationHistoryCounts>;
}) {
  const legacySegments = segments.filter((segment) => !segment.segmentLabel);
  const profileSegments = segments.filter((segment) => segment.segmentLabel);

  const profileGroups = new Map<string, StatementData[]>();
  for (const segment of profileSegments) {
    const label = segment.segmentLabel!;
    const group = profileGroups.get(label) ?? [];
    group.push(segment);
    profileGroups.set(label, group);
  }

  const hasAnySegments = segments.length > 0;
  const segmentCardCount = profileGroups.size + legacySegments.length;
  const useHorizontalLayout = segmentCardCount === 1;

  return (
    <section id="zielgruppen" className="scroll-mt-6">
      <h3 className="font-heading text-base font-medium text-text">
        Zielgruppen & Kundenprobleme
      </h3>

      <div
        className={`mt-3 grid gap-3 ${useHorizontalLayout ? "grid-cols-1" : "sm:grid-cols-2"}`}
      >
        {!hasAnySegments && (
          <p className="text-xs text-text-muted sm:col-span-2">
            Keine Zielgruppenhypothesen vorhanden.
          </p>
        )}

        {Array.from(profileGroups.entries()).map(([segmentLabel, group]) => (
          <SegmentProfileCard
            key={segmentLabel}
            projectId={projectId}
            segmentLabel={segmentLabel}
            statements={group}
            layout={useHorizontalLayout ? "horizontal" : "vertical"}
            onChanged={onChanged}
            onDeleted={onDeleted}
            onAdded={onAdded}
          />
        ))}

        {legacySegments.map((statement) => (
          <StatementCard
            key={statement.id}
            statement={statement}
            onChanged={onChanged}
            onDeleted={onDeleted}
          />
        ))}
      </div>

      <CustomerProblemsCard
        projectId={projectId}
        problems={problems}
        onChanged={onChanged}
        onDeleted={onDeleted}
        onAdded={onAdded}
        validationHistoryByStatementId={validationHistoryByStatementId}
      />
    </section>
  );
}
