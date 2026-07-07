"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import type { StatementData } from "@/components/statements/types";
import {
  SEGMENT_ASPECTS,
  SEGMENT_ASPECT_LABELS,
} from "@/lib/segmentAspects";

// Read-only disclosure below the target group dimension of an option card:
// shows the adopted phase 1 profile statements of the addressed segment.
// The profile is NOT duplicated — it is loaded live from phase 1 on expand,
// so evidence status changes there are always reflected here.
export function SegmentProfileDisclosure({
  projectId,
  segmentLabel,
}: {
  projectId: string;
  segmentLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statements, setStatements] = useState<StatementData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/statements?projectId=${encodeURIComponent(projectId)}&phase=1`
      );
      if (!response.ok) {
        throw new Error(
          "Das Segmentprofil konnte nicht geladen werden. Erneut versuchen."
        );
      }
      const all: StatementData[] = await response.json();
      setStatements(
        all.filter(
          (statement) =>
            statement.category === "TARGET_SEGMENT" &&
            statement.segmentLabel === segmentLabel &&
            statement.adopted
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das Segmentprofil konnte nicht geladen werden. Erneut versuchen."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    // Reload on every expand so the current phase 1 state is shown.
    if (next) void loadProfile();
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={expanded}
        className="inline-flex items-center gap-1 rounded text-xs font-medium text-text-muted transition-colors hover:text-accent"
      >
        <ChevronRight
          className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
          aria-hidden
        />
        Segmentprofil: {segmentLabel}
      </button>

      {expanded && (
        <div className="mt-1.5 rounded-md border border-border bg-background/60 p-2.5">
          {isLoading && (
            <p className="text-xs text-text-muted">
              Segmentprofil wird geladen …
            </p>
          )}

          {error && !isLoading && (
            <p className="text-xs text-danger-text">{error}</p>
          )}

          {!isLoading && !error && statements && statements.length === 0 && (
            <p className="text-xs text-text-muted">
              Für dieses Segment sind keine übernommenen Profilaussagen in
              Phase 1 vorhanden.
            </p>
          )}

          {!isLoading && !error && statements && statements.length > 0 && (
            <dl className="divide-y divide-border/70">
              {SEGMENT_ASPECTS.map((aspect) => {
                const statement = statements.find(
                  (candidate) => candidate.segmentAspect === aspect
                );
                if (!statement) return null;
                return (
                  <div
                    key={aspect}
                    className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0"
                  >
                    <dt className="w-[7.5rem] shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                      {SEGMENT_ASPECT_LABELS[aspect]}
                    </dt>
                    <dd className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                      <p className="text-xs leading-relaxed text-text">
                        {statement.content}
                      </p>
                      <span className="shrink-0">
                        {/* Read-only here: status changes happen in phase 1. */}
                        <EvidenceBadge status={statement.evidenceStatus} />
                      </span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}

          <p className="mt-2 border-t border-border/70 pt-2 text-[11px] text-text-muted">
            Quelle:{" "}
            <Link
              href={`/project/${projectId}/phase/1#zielgruppen`}
              className="underline decoration-border underline-offset-2 transition-colors hover:text-accent"
            >
              Situationsanalyse
            </Link>{" "}
            — Änderungen dort vornehmen
          </p>
        </div>
      )}
    </div>
  );
}
