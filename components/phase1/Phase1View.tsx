"use client";

import { useState } from "react";
import { LayoutGroup } from "framer-motion";
import { CheckCheck } from "lucide-react";
import { StatementCard } from "@/components/statements/StatementCard";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import { OriginTag } from "@/components/statements/OriginTag";
import type { StatementData } from "@/components/statements/types";
import { PhaseAdvanceButton } from "@/components/wizard/PhaseAdvanceButton";
import {
  AI_ERROR_FALLBACK,
  AI_LOADING_MESSAGES,
  PhaseEmptyState,
  PhaseErrorState,
} from "@/components/wizard/phaseStates";
import { isOnboardingNeeded } from "@/lib/profileQuestions";
import type { Phase1Statement, PestelRelevance } from "@/lib/schemas/phase1";
import type { Phase1StreamEvent } from "@/lib/phase1/events";
import { ProfileForm, type ProfileData } from "./ProfileForm";
import { ProfileOnboardingWizard } from "./onboarding/ProfileOnboardingWizard";
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

type Phase1FinalResponse = {
  statements: StatementData[];
  pestelRelevance: PestelRelevance[];
  incremental?: boolean;
  filteredDuplicateCount?: number;
};

type StreamEvent = Phase1StreamEvent & {
  details?: string;
};

function previewStatementToData(
  statement: Phase1Statement,
  previewId: string,
  projectId: string
): StatementData {
  return {
    id: previewId,
    projectId,
    phase: 1,
    category: statement.category,
    content: statement.content,
    evidenceStatus: statement.evidenceStatus,
    origin: statement.origin,
    justification: statement.justification,
    sourceRef: statement.sourceRef ?? null,
    uncertainty: statement.uncertainty ?? null,
    isCritical: false,
    adopted: false,
    segmentLabel: statement.segmentLabel ?? null,
    segmentAspect: statement.segmentAspect ?? null,
    competitorLabel: statement.competitorLabel ?? null,
    competitorAspect: statement.competitorAspect ?? null,
  };
}

function PreviewStatementCard({ statement }: { statement: StatementData }) {
  return (
    <div className="rounded-[10px] border border-dashed border-accent/40 bg-accent-soft/25 p-4 opacity-90">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <EvidenceBadge status={statement.evidenceStatus} />
          <span className="rounded-full border border-accent/30 bg-surface px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
            Vorläufig
          </span>
        </div>
        <OriginTag origin={statement.origin} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-text">{statement.content}</p>
      {statement.justification && (
        <p className="mt-2 border-t border-border/70 pt-2 text-[13px] text-text-muted">
          <span className="font-medium">Begründung:</span> {statement.justification}
        </p>
      )}
    </div>
  );
}

function applyFinalResponse(
  body: Phase1FinalResponse,
  setStatements: (statements: StatementData[]) => void,
  setPestelRelevance: (relevance: PestelRelevance[]) => void,
  setAnalysisInfo: (info: string | null) => void
) {
  setStatements(body.statements);
  if (Array.isArray(body.pestelRelevance)) {
    setPestelRelevance(body.pestelRelevance);
  }
  if (body.filteredDuplicateCount && body.filteredDuplicateCount > 0) {
    setAnalysisInfo(
      `${body.filteredDuplicateCount} ähnliche Aussage${body.filteredDuplicateCount === 1 ? "" : "n"} wurden nicht ergänzt — sie sind bereits im Projektstand enthalten.`
    );
  } else if (body.incremental) {
    const draftCount = body.statements.filter((statement) => !statement.adopted).length;
    if (draftCount === 0) {
      setAnalysisInfo(
        "Keine neuen Aussagen ergänzt — der bestehende Projektstand deckt das Profil bereits ab."
      );
    }
  }
}

async function consumeNdjsonStream(
  response: Response,
  onStatement: (statement: Phase1Statement, previewId: string) => void,
  onStatus?: (message: string) => void
): Promise<Phase1FinalResponse> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error(AI_ERROR_FALLBACK);
  }

  const decoder = new TextDecoder();
  let lineBuffer = "";
  const seenPreviewIds = new Set<string>();
  let finalPayload: Phase1FinalResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const event = JSON.parse(trimmed) as StreamEvent;
      if (event.type === "statement") {
        if (!seenPreviewIds.has(event.previewId)) {
          seenPreviewIds.add(event.previewId);
          onStatement(event.data as Phase1Statement, event.previewId);
        }
      } else if (event.type === "module_started") {
        onStatus?.(event.label);
      } else if (event.type === "anchor_started") {
        onStatus?.("Analysegrundlage wird erstellt");
      } else if (event.type === "synthesis_started") {
        onStatus?.("SWOT und Marktpfade werden abgeleitet");
      } else if (event.type === "consistency_check_started") {
        onStatus?.("Analyse wird auf Konsistenz geprüft");
      } else if (event.type === "persisting") {
        onStatus?.("Analyse wird gespeichert");
      } else if (event.type === "final") {
        finalPayload = event.data;
      } else if (event.type === "error") {
        const detail =
          typeof (event as { details?: string }).details === "string"
            ? `\n\nTechnisch: ${(event as { details?: string }).details}`
            : "";
        throw new Error(event.message + detail);
      } else if (event.type === "warning") {
        onStatus?.(event.message);
      }
    }
  }

  if (lineBuffer.trim()) {
    const event = JSON.parse(lineBuffer.trim()) as StreamEvent;
    if (event.type === "final") {
      finalPayload = event.data;
    } else if (event.type === "error") {
      const detail =
        typeof (event as { details?: string }).details === "string"
          ? `\n\nTechnisch: ${(event as { details?: string }).details}`
          : "";
      throw new Error(event.message + detail);
    }
  }

  if (!finalPayload) {
    throw new Error(AI_ERROR_FALLBACK);
  }

  return finalPayload;
}

export function Phase1View({
  project,
  initialStatements,
  initialPestelRelevance,
}: {
  project: ProfileData;
  initialStatements: StatementData[];
  initialPestelRelevance: PestelRelevance[];
}) {
  const [statements, setStatements] = useState(initialStatements);
  const [pestelRelevance, setPestelRelevance] = useState(initialPestelRelevance);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAdoptingAll, setIsAdoptingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisInfo, setAnalysisInfo] = useState<string | null>(null);
  const [previewStatements, setPreviewStatements] = useState<StatementData[]>([]);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [profile, setProfile] = useState(project);
  const [showOnboarding, setShowOnboarding] = useState(
    isOnboardingNeeded(project)
  );

  async function handleAnalyze() {
    setIsGenerating(true);
    setError(null);
    setAnalysisInfo(null);
    setPreviewStatements([]);
    setStreamStatus(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    try {
      const response = await fetch("/api/ai/1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/x-ndjson")) {
        if (!response.ok) {
          throw new Error(AI_ERROR_FALLBACK);
        }

        const finalPayload = await consumeNdjsonStream(
          response,
          (statement, previewId) => {
            setPreviewStatements((current) => [
              ...current,
              previewStatementToData(statement, previewId, project.id),
            ]);
          },
          (status) => setStreamStatus(status)
        );

        setPreviewStatements([]);
        setStreamStatus(null);
        applyFinalResponse(
          finalPayload,
          setStatements,
          setPestelRelevance,
          setAnalysisInfo
        );
      } else {
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          const detail =
            typeof body?.details === "string" ? `\n\nTechnisch: ${body.details}` : "";
          throw new Error((body?.error ?? AI_ERROR_FALLBACK) + detail);
        }
        applyFinalResponse(body, setStatements, setPestelRelevance, setAnalysisInfo);
      }
    } catch (err) {
      setPreviewStatements([]);
      if (err instanceof Error && err.name === "AbortError") {
        setError(
          "Die Analyse hat zu lange gedauert (über 10 Minuten). Erneut versuchen — deine Eingaben bleiben erhalten."
        );
      } else {
        setError(err instanceof Error ? err.message : AI_ERROR_FALLBACK);
      }
    } finally {
      clearTimeout(timeoutId);
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
  const showPreview = isGenerating && previewStatements.length > 0;

  return (
    <LayoutGroup>
    <div className="flex flex-col gap-8">
      {showOnboarding ? (
        <ProfileOnboardingWizard
          project={profile}
          onComplete={(updated) => {
            setProfile(updated);
            setShowOnboarding(false);
          }}
        />
      ) : (
        <ProfileForm
          project={profile}
          isGenerating={isGenerating}
          hasResults={hasResults}
          hasAdopted={hasAdopted}
          onAnalyze={handleAnalyze}
          layoutId="profile-card"
        />
      )}

      {analysisInfo && !error && (
        <p className="text-xs text-text-muted">{analysisInfo}</p>
      )}

      {error && <PhaseErrorState message={error} />}

      {isGenerating && !showPreview && (
        <p className="text-sm text-text-muted" aria-live="polite" aria-busy="true">
          {streamStatus ?? AI_LOADING_MESSAGES[1]}
        </p>
      )}

      {showPreview && (
        <section
          aria-live="polite"
          aria-busy="true"
          className="flex flex-col gap-3"
        >
          <p className="text-sm text-text-muted">
            {streamStatus ?? AI_LOADING_MESSAGES[1]} — Aussagen erscheinen vorläufig,
            solange die Analyse läuft.
          </p>
          <div className="flex flex-col gap-3">
            {previewStatements.map((statement) => (
              <PreviewStatementCard key={statement.id} statement={statement} />
            ))}
          </div>
        </section>
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
            pestelRelevance={pestelRelevance}
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
        <PhaseEmptyState>
          In dieser Phase beschreibst du dein Start-up und erhältst ein
          Analysebild aus PESTEL, Zielgruppen, Wettbewerb und SWOT. Starte mit
          „Analyse erstellen“.
        </PhaseEmptyState>
      )}

      <PhaseAdvanceButton
        projectId={project.id}
        nextPhase={2}
        enabled={hasAdopted}
        disabledHint="Übernimm zuerst mindestens eine Aussage in den Projektstand."
      />
    </div>
    </LayoutGroup>
  );
}
