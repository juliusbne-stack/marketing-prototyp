"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, MoreVertical, Plus } from "lucide-react";
import { AddStatementForm } from "./AddStatementForm";
import { AddCompetitorAspectForm } from "./AddCompetitorAspectForm";
import { CompactStatementRow } from "./CompactStatementRow";
import type { StatementData } from "@/components/statements/types";
import {
  COMPETITOR_ASPECTS,
  COMPETITOR_ASPECT_LABELS,
  isCompetitorAspect,
  type CompetitorAspect,
} from "@/lib/competitorAspects";

function evidenceCounts(statements: StatementData[]) {
  return {
    facts: statements.filter((s) => s.evidenceStatus === "FACT").length,
    assumptions: statements.filter((s) => s.evidenceStatus === "ASSUMPTION")
      .length,
    open: statements.filter((s) => s.evidenceStatus === "OPEN_QUESTION").length,
  };
}

function statementForAspect(
  statements: StatementData[],
  aspect: CompetitorAspect
) {
  return statements.find((statement) => statement.competitorAspect === aspect);
}

function truncate(text: string, max: number) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function entityTypeShort(statements: StatementData[]): string | null {
  const entityType = statementForAspect(statements, "ENTITY_TYPE");
  if (!entityType) return null;

  const normalized = entityType.content.toLowerCase();
  if (normalized.includes("direkt")) return "Direkt";
  if (normalized.includes("indirekt")) return "Indirekt";
  if (normalized.includes("substitut")) return "Substitut";
  if (normalized.includes("status quo") || normalized.includes("nicht-nutzung")) {
    return "Status quo";
  }
  return truncate(entityType.content, 28);
}

function aspectSnippet(
  statements: StatementData[],
  aspect: CompetitorAspect,
  max = 36
): string | null {
  const statement = statementForAspect(statements, aspect);
  if (!statement) return null;
  return truncate(statement.content, max);
}

function CompetitorAccordionRow({
  projectId,
  competitorLabel,
  statements,
  defaultExpanded = false,
  onChanged,
  onDeleted,
  onAdded,
}: {
  projectId: string;
  competitorLabel: string;
  statements: StatementData[];
  defaultExpanded?: boolean;
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [isAdopting, setIsAdopting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aspectFormOpen, setAspectFormOpen] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasDraft = statements.some((statement) => !statement.adopted);
  const typeLabel = entityTypeShort(statements);
  const pricingSnippet = aspectSnippet(statements, "PRICING", 32);

  const existingAspects = statements
    .map((statement) => statement.competitorAspect)
    .filter(
      (aspect): aspect is CompetitorAspect =>
        !!aspect && isCompetitorAspect(aspect)
    );
  const canAddAspect = existingAspects.length < COMPETITOR_ASPECTS.length;

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

  async function adoptProfile(event: React.MouseEvent) {
    event.stopPropagation();
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
          if (!response.ok) throw new Error("adopt failed");
          return (await response.json()) as StatementData;
        })
      );
      for (const updated of results) {
        onChanged(updated);
      }
    } catch {
      setAdoptError(
        "Das Profil konnte nicht übernommen werden. Erneut versuchen."
      );
    } finally {
      setIsAdopting(false);
    }
  }

  return (
    <div
      className={
        hasDraft
          ? "border-b border-border/70 bg-accent-soft/20 last:border-b-0"
          : "border-b border-border/70 last:border-b-0"
      }
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-background/60 sm:gap-3 sm:px-4"
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden
        />

        <span className="min-w-0 flex-1 font-medium text-sm text-text">
          {competitorLabel}
        </span>

        <span className="hidden items-center gap-2 sm:flex">
          {typeLabel && (
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-text-muted ring-1 ring-border">
              {typeLabel}
            </span>
          )}
          {pricingSnippet && (
            <span className="max-w-[10rem] truncate text-xs text-text-muted">
              {pricingSnippet}
            </span>
          )}
        </span>

        {hasDraft && (
          <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
            Entwurf
          </span>
        )}
      </button>

      {!expanded && (typeLabel || pricingSnippet) && (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-2.5 pl-9 sm:hidden">
          {typeLabel && (
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-text-muted ring-1 ring-border">
              {typeLabel}
            </span>
          )}
          {pricingSnippet && (
            <span className="text-xs text-text-muted">{pricingSnippet}</span>
          )}
        </div>
      )}

      {expanded && (
        <div className="border-t border-border/50 bg-background/40 px-3 pb-3 pt-2 sm:px-4">
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
            {canAddAspect && (
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
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
                        onClick={(event) => {
                          event.stopPropagation();
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

          {aspectFormOpen && (
            <div className="mb-3">
              <AddCompetitorAspectForm
                projectId={projectId}
                competitorLabel={competitorLabel}
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
            <p className="mb-2 text-xs text-danger-text">{adoptError}</p>
          )}

          <div className="divide-y divide-border/70 rounded-md border border-border/60 bg-surface">
            {COMPETITOR_ASPECTS.map((aspect) => (
              <div key={aspect} className="px-3">
                <CompactStatementRow
                  statement={statementForAspect(statements, aspect)}
                  aspectLabel={COMPETITOR_ASPECT_LABELS[aspect]}
                  onChanged={onChanged}
                  onDeleted={onDeleted}
                  emptyPlaceholder="Noch keine Aussage zu dieser Dimension."
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompetitorListPanel({
  projectId,
  profileGroups,
  onChanged,
  onDeleted,
  onAdded,
}: {
  projectId: string;
  profileGroups: Map<string, StatementData[]>;
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
}) {
  const allProfileStatements = Array.from(profileGroups.values()).flat();
  const { facts, assumptions, open } = evidenceCounts(allProfileStatements);
  const hasDraft = allProfileStatements.some((statement) => !statement.adopted);

  const frameClasses = hasDraft
    ? "border border-dashed border-accent/50 bg-accent-soft/30"
    : "border border-border bg-surface";

  return (
    <article className={`mt-3 overflow-hidden rounded-[10px] ${frameClasses}`}>
      <header className="border-b border-border/70 px-4 py-3">
        <h4 className="font-heading text-sm font-medium text-text">
          Relevante Akteure ({profileGroups.size})
        </h4>
        <p className="mt-0.5 text-xs text-text-muted">
          {facts} Fakten · {assumptions} Annahmen · {open} offen — zum
          Aufklappen anklicken
        </p>
      </header>

      <div>
        {Array.from(profileGroups.entries()).map(([competitorLabel, group]) => (
          <CompetitorAccordionRow
            key={competitorLabel}
            projectId={projectId}
            competitorLabel={competitorLabel}
            statements={group}
            onChanged={onChanged}
            onDeleted={onDeleted}
            onAdded={onAdded}
          />
        ))}
      </div>
    </article>
  );
}

function LandscapeCard({
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
  const [expanded, setExpanded] = useState(false);
  const { facts, assumptions, open } = evidenceCounts(statements);
  const hasDraft = statements.some((statement) => !statement.adopted);

  const frameClasses = hasDraft
    ? "border border-dashed border-accent/50 bg-accent-soft/30"
    : "border border-border bg-surface";

  if (statements.length === 0) return null;

  return (
    <article className={`mt-4 overflow-hidden rounded-[10px] ${frameClasses}`}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-background/60"
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h4 className="font-heading text-sm font-medium text-text">
            Wettbewerbslandschaft ({statements.length})
          </h4>
          <p className="mt-0.5 text-xs text-text-muted">
            {facts} Fakten · {assumptions} Annahmen · {open} offen
          </p>
        </div>
        {hasDraft && (
          <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
            Entwurf
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/70 px-4 pb-3 pt-1">
          <div className="divide-y divide-border/70">
            {statements.map((statement) => (
              <CompactStatementRow
                key={statement.id}
                statement={statement}
                showOriginInline
                showAdoptInline
                onChanged={onChanged}
                onDeleted={onDeleted}
              />
            ))}
          </div>

          <div className="mt-3 border-t border-border/70 pt-3">
            <AddStatementForm
              projectId={projectId}
              categories={[
                { value: "COMPETITOR", label: "Landschafts-Aussage" },
              ]}
              onAdded={onAdded}
            />
          </div>
        </div>
      )}
    </article>
  );
}

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
  const legacyStatements = statements.filter(
    (statement) => !statement.competitorLabel
  );
  const profileStatements = statements.filter(
    (statement) => statement.competitorLabel
  );

  const profileGroups = new Map<string, StatementData[]>();
  for (const statement of profileStatements) {
    const label = statement.competitorLabel!;
    const group = profileGroups.get(label) ?? [];
    group.push(statement);
    profileGroups.set(label, group);
  }

  const hasProfiles = profileGroups.size > 0;

  return (
    <section id="wettbewerb" className="scroll-mt-6">
      <h3 className="font-heading text-base font-medium text-text">
        Wettbewerb & Alternativen
      </h3>
      <p className="mt-1 text-xs text-text-muted">
        Relevante Akteure aus Kundensicht — mit simulierten Kennzahlen (fiktiv).
      </p>

      {!hasProfiles && legacyStatements.length === 0 && (
        <p className="mt-3 text-xs text-text-muted">
          Keine Wettbewerberprofile vorhanden.
        </p>
      )}

      {hasProfiles && (
        <CompetitorListPanel
          projectId={projectId}
          profileGroups={profileGroups}
          onChanged={onChanged}
          onDeleted={onDeleted}
          onAdded={onAdded}
        />
      )}

      <LandscapeCard
        projectId={projectId}
        statements={legacyStatements}
        onChanged={onChanged}
        onDeleted={onDeleted}
        onAdded={onAdded}
      />

      {!hasProfiles && legacyStatements.length === 0 && (
        <div className="mt-3">
          <AddStatementForm
            projectId={projectId}
            categories={[
              { value: "COMPETITOR", label: "Landschafts-Aussage" },
            ]}
            onAdded={onAdded}
          />
        </div>
      )}
    </section>
  );
}
