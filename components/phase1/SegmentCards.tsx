"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  CircleAlert,
  MoreVertical,
  Plus,
  Users,
} from "lucide-react";
import { StatementCard } from "@/components/statements/StatementCard";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";
import type { StatementData } from "@/components/statements/types";
import type { ValidationHistoryCounts } from "@/lib/validation";
import {
  SEGMENT_ASPECTS,
  SEGMENT_ASPECT_LABELS,
  WHO_SEGMENT_ASPECTS,
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

// Soft card washes — deliberately neutral, not evidence colors (UI_KONZEPT).
const SEGMENT_CARD_TINTS = [
  "bg-[#F2F7F3]",
  "bg-[#F1F6F8]",
  "bg-[#F8F4F0]",
  "bg-[#F3F6F4]",
] as const;

const ASPECT_TILE =
  "min-w-0 rounded-[8px] border border-border/55 bg-surface/95 px-3 py-2.5 shadow-[0_1px_0_rgba(31,36,33,0.03)]";

function SegmentProfileCard({
  projectId,
  segmentLabel,
  statements,
  onChanged,
  onDeleted,
  onAdded,
  toneIndex = 0,
  defaultOpen = false,
}: {
  projectId: string;
  segmentLabel: string;
  statements: StatementData[];
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
  toneIndex?: number;
  defaultOpen?: boolean;
}) {
  const { facts, assumptions, open } = evidenceCounts(statements);
  const hasDraft = statements.some((statement) => !statement.adopted);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isAdopting, setIsAdopting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aspectFormOpen, setAspectFormOpen] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const existingAspects = statements
    .map((statement) => statement.segmentAspect)
    .filter((aspect): aspect is SegmentAspect => !!aspect && isSegmentAspect(aspect));
  const canAddAspect = SEGMENT_ASPECTS.some(
    (aspect) => !existingAspects.includes(aspect)
  );

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

  const tint =
    SEGMENT_CARD_TINTS[toneIndex % SEGMENT_CARD_TINTS.length] ??
    SEGMENT_CARD_TINTS[0];
  const frameClasses = hasDraft
    ? "border border-dashed border-accent/50 bg-accent-soft/35"
    : `border border-border/80 ${tint}`;

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
    <article
      className={`overflow-hidden rounded-[10px] ${frameClasses} border-l-2 border-l-accent/35`}
    >
      <header
        className={`flex items-stretch bg-accent-soft/40 ${
          isOpen ? "border-b border-border/60" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="group flex min-w-0 flex-1 items-start justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-accent-soft/55"
        >
          <div className="min-w-0">
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-deep">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Zielgruppe
            </div>
            <h4 className="font-heading text-base font-medium text-text transition-colors group-hover:text-accent">
              {segmentLabel}
            </h4>
            <p className="mt-1 text-xs text-text-muted">
              Segmentprofil · {facts} Fakten · {assumptions} Annahmen · {open}{" "}
              offen
            </p>
          </div>
          <ChevronDown
            className={`mt-1 h-4 w-4 shrink-0 text-text-muted transition-[transform,color] duration-200 group-hover:text-accent motion-reduce:transition-none ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>

        <div className="flex shrink-0 items-start gap-2 py-3 pr-4">
          {canAddAspect && (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(true);
                  setMenuOpen((value) => !value);
                }}
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
                        setIsOpen(true);
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
              className="btn-primary btn-primary--sm"
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
              {isAdopting ? "Wird übernommen …" : "Profil übernehmen"}
            </button>
          )}
        </div>
      </header>

      {isOpen && (
        <>
          {(aspectFormOpen || adoptError) && (
            <div className="border-b border-border/60 bg-accent-soft/25 px-4 py-3">
              {aspectFormOpen && (
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
              )}
              {adoptError && (
                <p className="text-xs text-danger-text">{adoptError}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2">
            {SEGMENT_ASPECTS.map((aspect) => {
              const statement = statements.find(
                (candidate) => candidate.segmentAspect === aspect
              );

              return (
                <div
                  key={aspect}
                  className={`${ASPECT_TILE} ${
                    WHO_SEGMENT_ASPECTS.includes(
                      aspect as (typeof WHO_SEGMENT_ASPECTS)[number]
                    )
                      ? "sm:col-span-2"
                      : ""
                  }`}
                >
                  <CompactStatementRow
                    statement={statement}
                    aspectLabel={SEGMENT_ASPECT_LABELS[aspect]}
                    onChanged={onChanged}
                    onDeleted={onDeleted}
                    emptyPlaceholder="Noch keine Aussage zu dieser Dimension."
                    layout="column"
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
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
    ? "border border-dashed border-accent/50 bg-accent-soft/35"
    : "border border-border/80 bg-[#F6F3EE]";

  return (
    <article className={`mt-5 overflow-hidden rounded-[10px] ${frameClasses}`}>
      <header className="border-b border-border/60 bg-surface/80 px-4 py-3">
        <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted ring-1 ring-border">
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Übergreifend
        </div>
        <h4 className="font-heading text-base font-medium text-text">
          Kundenprobleme
        </h4>
        {problems.length > 0 && (
          <p className="mt-1 text-xs text-text-muted">
            Geteilte Bedarfe · {facts} Fakten · {assumptions} Annahmen · {open}{" "}
            offen
          </p>
        )}
      </header>

      {problems.length === 0 ? (
        <p className="px-4 py-3 text-xs text-text-muted">
          Keine Aussagen zu Kundenproblemen vorhanden.
        </p>
      ) : (
        <div className="flex flex-col gap-2 p-3">
          {problems.map((statement) => (
            <div key={statement.id} className={ASPECT_TILE}>
              <CompactStatementRow
                statement={statement}
                showOriginInline
                showAdoptInline
                validationHistory={validationHistoryByStatementId?.get(
                  statement.id
                )}
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
  const profileEntries = Array.from(profileGroups.entries());

  return (
    <CollapsibleSection
      id="zielgruppen"
      title="Zielgruppen & Kundenprobleme"
      highlightUntilOpened
      className="scroll-mt-[20rem] sm:scroll-mt-[12rem] lg:scroll-mt-[9rem]"
    >
      <div className="flex flex-col gap-3">
        {!hasAnySegments && (
          <p className="text-xs text-text-muted">
            Keine Zielgruppenhypothesen vorhanden.
          </p>
        )}

        {profileEntries.map(([segmentLabel, group], index) => (
          <SegmentProfileCard
            key={segmentLabel}
            projectId={projectId}
            segmentLabel={segmentLabel}
            statements={group}
            toneIndex={index}
            defaultOpen={index === 0}
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
    </CollapsibleSection>
  );
}
