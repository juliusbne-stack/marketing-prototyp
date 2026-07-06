"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import { StatementCard } from "@/components/statements/StatementCard";
import type { StatementData } from "@/components/statements/types";
import { PhaseAdvanceButton } from "@/components/wizard/PhaseAdvanceButton";
import { ProfileForm, type ProfileData } from "./ProfileForm";
import { AddStatementForm } from "./AddStatementForm";
import { PestelGrid } from "./PestelGrid";
import { SegmentCards } from "./SegmentCards";
import { CompetitorCards } from "./CompetitorCards";
import { SwotMatrix } from "./SwotMatrix";

const ANCHORS = [
  { href: "#pestel", label: "PESTEL" },
  { href: "#zielgruppen", label: "Zielgruppen & Probleme" },
  { href: "#wettbewerb", label: "Wettbewerb" },
  { href: "#ressourcen", label: "Ressourcen" },
  { href: "#swot", label: "SWOT & Marktpfade" },
];

export function Phase1View({
  project,
  initialStatements,
}: {
  project: ProfileData;
  initialStatements: StatementData[];
}) {
  const [statements, setStatements] = useState(initialStatements);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdoptingAll, setIsAdoptingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Eingaben bleiben erhalten."
        );
      }
      setStatements(body.statements);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Eingaben bleiben erhalten."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleAdoptAll() {
    setIsAdoptingAll(true);
    setError(null);
    try {
      const response = await fetch("/api/statements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, phase: 1 }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ?? "Die Übernahme konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      const updated: StatementData[] = await response.json();
      setStatements(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Übernahme konnte nicht gespeichert werden. Erneut versuchen."
      );
    } finally {
      setIsAdoptingAll(false);
    }
  }

  function handleChanged(updated: StatementData) {
    setStatements((current) =>
      current.map((statement) =>
        statement.id === updated.id ? updated : statement
      )
    );
  }

  function handleDeleted(id: string) {
    setStatements((current) =>
      current.filter((statement) => statement.id !== id)
    );
  }

  function handleAdded(created: StatementData) {
    setStatements((current) => [...current, created]);
  }

  const byCategory = (prefixOrExact: string) =>
    statements.filter((statement) =>
      prefixOrExact.endsWith("_")
        ? statement.category.startsWith(prefixOrExact)
        : statement.category === prefixOrExact
    );

  const factCount = statements.filter(
    (statement) => statement.evidenceStatus === "FACT"
  ).length;
  const assumptionCount = statements.filter(
    (statement) => statement.evidenceStatus === "ASSUMPTION"
  ).length;
  const questionCount = statements.filter(
    (statement) => statement.evidenceStatus === "OPEN_QUESTION"
  ).length;
  const draftCount = statements.filter(
    (statement) => !statement.adopted
  ).length;

  const hasResults = statements.length > 0;
  const resources = byCategory("RESOURCE");
  const hasAdopted = statements.some((statement) => statement.adopted);

  return (
    <div className="flex flex-col gap-8">
      <ProfileForm
        project={project}
        isGenerating={isGenerating}
        hasResults={hasResults}
        onAnalyze={handleAnalyze}
      />

      {error && (
        <div className="rounded-[10px] border border-danger-text/30 bg-danger-bg p-4 text-sm text-danger-text">
          {error}
        </div>
      )}

      {isGenerating && (
        <div aria-live="polite" className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Die KI erstellt einen Analyse-Entwurf mit simulierten
            Recherchedaten …
          </p>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-[10px] border border-border bg-surface"
            >
              <div className="m-4 h-3 w-1/4 rounded bg-border" />
              <div className="mx-4 h-3 w-3/4 rounded bg-border/60" />
            </div>
          ))}
        </div>
      )}

      {hasResults && !isGenerating && (
        <>
          <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-border bg-surface px-4 py-3 shadow-sm">
            <p className="text-sm text-text">
              <span className="font-medium">{factCount} Fakten</span>
              <span className="text-text-muted"> · </span>
              <span className="font-medium">{assumptionCount} Annahmen</span>
              <span className="text-text-muted"> · </span>
              <span className="font-medium">
                {questionCount} offene Fragen
              </span>
            </p>
            <nav
              aria-label="Abschnitte"
              className="flex flex-wrap gap-3 text-xs"
            >
              {ANCHORS.map((anchor) => (
                <a
                  key={anchor.href}
                  href={anchor.href}
                  className="text-accent hover:underline"
                >
                  {anchor.label}
                </a>
              ))}
            </nav>
            <div className="ml-auto">
              {draftCount > 0 ? (
                <button
                  type="button"
                  onClick={handleAdoptAll}
                  disabled={isAdoptingAll}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                  {isAdoptingAll
                    ? "Wird übernommen …"
                    : `Alle Entwürfe übernehmen (${draftCount})`}
                </button>
              ) : (
                <span className="text-xs font-medium text-evidence-fact-text">
                  Alle Aussagen übernommen
                </span>
              )}
            </div>
          </div>

          <PestelGrid
            projectId={project.id}
            statements={byCategory("PESTEL_")}
            onChanged={handleChanged}
            onDeleted={handleDeleted}
            onAdded={handleAdded}
          />

          <SegmentCards
            projectId={project.id}
            segments={byCategory("TARGET_SEGMENT")}
            problems={byCategory("CUSTOMER_PROBLEM")}
            onChanged={handleChanged}
            onDeleted={handleDeleted}
            onAdded={handleAdded}
          />

          <CompetitorCards
            projectId={project.id}
            statements={byCategory("COMPETITOR")}
            onChanged={handleChanged}
            onDeleted={handleDeleted}
            onAdded={handleAdded}
          />

          <section id="ressourcen" className="scroll-mt-6">
            <h3 className="font-heading text-base font-medium text-text">
              Ressourcen & Fähigkeiten
            </h3>
            <div className="mt-3 flex flex-col gap-3">
              {resources.length === 0 && (
                <p className="text-xs text-text-muted">
                  Keine Ressourcen-Aussagen vorhanden.
                </p>
              )}
              {resources.map((statement) => (
                <StatementCard
                  key={statement.id}
                  statement={statement}
                  onChanged={handleChanged}
                  onDeleted={handleDeleted}
                />
              ))}
              <AddStatementForm
                projectId={project.id}
                categories={[{ value: "RESOURCE", label: "Ressource" }]}
                onAdded={handleAdded}
              />
            </div>
          </section>

          <SwotMatrix
            projectId={project.id}
            statements={byCategory("SWOT_")}
            marketPaths={byCategory("MARKET_PATH")}
            onChanged={handleChanged}
            onDeleted={handleDeleted}
            onAdded={handleAdded}
          />
        </>
      )}

      {!hasResults && !isGenerating && (
        <div className="rounded-[10px] border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          Fülle das Start-up-Profil aus und starte mit „Analyse erstellen“.
          Die KI erzeugt daraus ein evidenzbewertetes Analysebild aus PESTEL,
          Zielgruppen, Wettbewerb und SWOT — mit simulierten, fiktiven
          Recherchedaten.
        </div>
      )}

      <PhaseAdvanceButton
        projectId={project.id}
        nextPhase={2}
        enabled={hasAdopted}
        disabledHint="Übernimm zuerst mindestens eine Aussage in den Projektstand."
      />
    </div>
  );
}
