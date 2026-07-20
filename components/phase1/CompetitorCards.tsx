"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Layers,
  MoreVertical,
  Plus,
} from "lucide-react";
import { AddStatementForm } from "./AddStatementForm";
import { AddCompetitorAspectForm } from "./AddCompetitorAspectForm";
import { AddCompetitorForm } from "./AddCompetitorForm";
import { CompactStatementRow } from "./CompactStatementRow";
import type { StatementData } from "@/components/statements/types";
import {
  COMPETITOR_ASPECTS,
  COMPETITOR_ASPECT_LABELS,
  isCompetitorAspect,
  type CompetitorAspect,
} from "@/lib/competitorAspects";
import { SIMULATED_FACT_TOOLTIP } from "@/components/statements/EvidenceBadge";
import { CollapsibleSection } from "@/components/wizard/CollapsibleSection";

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

type EntityTypeKind =
  | "direct"
  | "indirect"
  | "substitute"
  | "status_quo"
  | "other";

/** Soft type chips — readable at a glance, never louder than the card header. */
const ENTITY_TYPE_BADGE: Record<EntityTypeKind, string> = {
  direct: "bg-accent-soft text-accent-deep ring-accent-border/80",
  indirect: "bg-[#eef7ff] text-[#1d67a6] ring-[#5aa7e8]/35",
  substitute: "bg-[#fff5e8] text-[#a55b00] ring-[#f3a536]/35",
  status_quo: "bg-[#f4f1f5] text-[#6b5b72] ring-[#b9a9c0]/40",
  other: "bg-background text-text-muted ring-border",
};

function resolveEntityType(
  statements: StatementData[]
): { label: string; kind: EntityTypeKind } | null {
  const entityType = statementForAspect(statements, "ENTITY_TYPE");
  if (!entityType) return null;

  const normalized = entityType.content.toLowerCase();
  // "indirekt" before "direkt" — otherwise "indirekt" matches "direkt".
  if (normalized.includes("indirekt")) {
    return { label: "Indirekt", kind: "indirect" };
  }
  if (normalized.includes("direkt")) {
    return { label: "Direkt", kind: "direct" };
  }
  if (
    normalized.includes("substitut") ||
    normalized.includes("ersatz") ||
    normalized.includes("teilersatz")
  ) {
    if (normalized.includes("teilersatz")) {
      return { label: "Teilersatz", kind: "substitute" };
    }
    if (normalized.includes("ersatz")) {
      return { label: "Ersatzlösung", kind: "substitute" };
    }
    return { label: "Substitut", kind: "substitute" };
  }
  if (normalized.includes("status quo") || normalized.includes("nicht-nutzung")) {
    return { label: "Status quo", kind: "status_quo" };
  }
  return { label: truncate(entityType.content, 28), kind: "other" };
}

/** Soft card washes — same family as SegmentCards / SWOT (neutral, not evidence colors). */
const COMPETITOR_CARD_TINTS = [
  "bg-[#F2F7F3]",
  "bg-[#F1F6F8]",
  "bg-[#F8F4F0]",
  "bg-[#F3F6F4]",
] as const;

const ASPECT_TILE =
  "min-w-0 rounded-[8px] border border-border/55 bg-surface/95 px-3 py-2.5 shadow-[0_1px_0_rgba(31,36,33,0.03)]";

/** Longer narrative aspects — full width in the tile grid. */
const WIDE_COMPETITOR_ASPECTS: readonly CompetitorAspect[] = [
  "OFFERING",
  "RELEVANCE",
];

function CompetitorProfileCard({
  projectId,
  competitorLabel,
  statements,
  toneIndex = 0,
  defaultOpen = false,
  onChanged,
  onDeleted,
  onAdded,
}: {
  projectId: string;
  competitorLabel: string;
  statements: StatementData[];
  toneIndex?: number;
  defaultOpen?: boolean;
  onChanged: (statement: StatementData) => void;
  onDeleted: (id: string) => void;
  onAdded: (statement: StatementData) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isAdopting, setIsAdopting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aspectFormOpen, setAspectFormOpen] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { facts, assumptions, open } = evidenceCounts(statements);
  const hasDraft = statements.some((statement) => !statement.adopted);
  const entityType = resolveEntityType(statements);

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

  const tint =
    COMPETITOR_CARD_TINTS[toneIndex % COMPETITOR_CARD_TINTS.length] ??
    COMPETITOR_CARD_TINTS[0];
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
            throw new Error("Das Profil konnte nicht übernommen werden.");
          }
          return (await response.json()) as StatementData;
        })
      );
      for (const updated of results) {
        onChanged(updated);
      }
    } catch (err) {
      setAdoptError(
        err instanceof Error
          ? err.message
          : "Das Profil konnte nicht übernommen werden. Erneut versuchen."
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
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-deep">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                Akteur
              </span>
              {entityType && (
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ${ENTITY_TYPE_BADGE[entityType.kind]}`}
                >
                  {entityType.label}
                </span>
              )}
              {hasDraft && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-deep">
                  Entwurf
                </span>
              )}
            </div>
            <h4 className="font-heading text-base font-medium text-text transition-colors group-hover:text-accent">
              {competitorLabel}
            </h4>
            <p className="mt-1 text-xs text-text-muted">
              Wettbewerbsprofil · {facts} Fakten · {assumptions} Annahmen ·{" "}
              {open} offen
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
              )}
              {adoptError && (
                <p className="text-xs text-danger-text">{adoptError}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2">
            {COMPETITOR_ASPECTS.map((aspect) => (
              <div
                key={aspect}
                className={`${ASPECT_TILE} ${
                  WIDE_COMPETITOR_ASPECTS.includes(aspect) ? "sm:col-span-2" : ""
                }`}
              >
                <CompactStatementRow
                  statement={statementForAspect(statements, aspect)}
                  aspectLabel={COMPETITOR_ASPECT_LABELS[aspect]}
                  onChanged={onChanged}
                  onDeleted={onDeleted}
                  emptyPlaceholder="Noch keine Aussage zu dieser Dimension."
                  factTooltip={SIMULATED_FACT_TOOLTIP}
                  layout="column"
                />
              </div>
            ))}
          </div>
        </>
      )}
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
  const [isOpen, setIsOpen] = useState(false);
  const { facts, assumptions, open } = evidenceCounts(statements);
  const hasDraft = statements.some((statement) => !statement.adopted);

  const frameClasses = hasDraft
    ? "border border-dashed border-accent/50 bg-accent-soft/35"
    : "border border-border/80 bg-[#F1F6F8]";

  if (statements.length === 0) return null;

  return (
    <article className={`mt-5 overflow-hidden rounded-[10px] ${frameClasses}`}>
      <header
        className={`flex items-stretch bg-surface/80 ${
          isOpen ? "border-b border-border/60" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          className="group flex min-w-0 flex-1 items-start justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-background/50"
        >
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-background px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted ring-1 ring-border">
                <Layers className="h-3.5 w-3.5" aria-hidden />
                Übergreifend
              </span>
              {hasDraft && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-deep">
                  Entwurf
                </span>
              )}
            </div>
            <h4 className="font-heading text-base font-medium text-text transition-colors group-hover:text-accent">
              Wettbewerbslandschaft
            </h4>
            <p className="mt-1 text-xs text-text-muted">
              {statements.length} Aussagen · {facts} Fakten · {assumptions}{" "}
              Annahmen · {open} offen
            </p>
          </div>
          <ChevronDown
            className={`mt-1 h-4 w-4 shrink-0 text-text-muted transition-[transform,color] duration-200 group-hover:text-accent motion-reduce:transition-none ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
      </header>

      {isOpen && (
        <>
          <div className="flex flex-col gap-2 p-3">
            {statements.map((statement) => (
              <div key={statement.id} className={ASPECT_TILE}>
                <CompactStatementRow
                  statement={statement}
                  showOriginInline
                  showAdoptInline
                  onChanged={onChanged}
                  onDeleted={onDeleted}
                  factTooltip={SIMULATED_FACT_TOOLTIP}
                />
              </div>
            ))}
          </div>

          <div className="border-t border-border/60 bg-surface/50 px-4 py-3">
            <AddStatementForm
              projectId={projectId}
              categories={[
                { value: "COMPETITOR", label: "Landschafts-Aussage" },
              ]}
              onAdded={onAdded}
            />
          </div>
        </>
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

  const profileEntries = Array.from(profileGroups.entries());
  const hasProfiles = profileEntries.length > 0;

  return (
    <CollapsibleSection
      id="wettbewerb"
      title="Wettbewerb & Alternativen"
      highlightUntilOpened
      className="scroll-mt-[20rem] sm:scroll-mt-[12rem] lg:scroll-mt-[9rem]"
      intro="Wettbewerbsumfeld aus Kundensicht — direkte & indirekte Akteure, Substitute und Alternativen (simulierte Kennzahlen, fiktiv)."
    >
      <div className="flex flex-col gap-3">
        {!hasProfiles && legacyStatements.length === 0 && (
          <p className="text-xs text-text-muted">
            Noch keine Akteure im Wettbewerbsumfeld erfasst.
          </p>
        )}

        {hasProfiles && (
          <p className="text-xs text-text-muted">
            Relevante Akteure ({profileEntries.length}) — zum Aufklappen
            anklicken
          </p>
        )}

        {profileEntries.map(([competitorLabel, group], index) => (
          <CompetitorProfileCard
            key={competitorLabel}
            projectId={projectId}
            competitorLabel={competitorLabel}
            statements={group}
            toneIndex={index}
            defaultOpen={index === 0}
            onChanged={onChanged}
            onDeleted={onDeleted}
            onAdded={onAdded}
          />
        ))}

        {(hasProfiles || legacyStatements.length === 0) && (
          <div className="group/add-actor overflow-hidden rounded-[10px] border border-border/70 bg-surface/80 transition-[border-color,background-color,box-shadow] duration-200 hover:border-accent/45 hover:bg-accent-soft/40 hover:shadow-[0_1px_0_rgba(31,36,33,0.04)]">
            <AddCompetitorForm
              projectId={projectId}
              existingLabels={profileEntries.map(([label]) => label)}
              onAdded={onAdded}
            />
          </div>
        )}
      </div>

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

      {!hasProfiles && legacyStatements.length > 0 && (
        <footer className="group/add-actor mt-3 overflow-hidden rounded-[10px] border border-border/70 bg-surface/80 transition-[border-color,background-color,box-shadow] duration-200 hover:border-accent/45 hover:bg-accent-soft/40 hover:shadow-[0_1px_0_rgba(31,36,33,0.04)]">
          <AddCompetitorForm
            projectId={projectId}
            existingLabels={[]}
            onAdded={onAdded}
          />
        </footer>
      )}
    </CollapsibleSection>
  );
}
