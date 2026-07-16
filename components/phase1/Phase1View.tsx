"use client";

import { useEffect, useState } from "react";
import { LayoutGroup } from "framer-motion";
import { CheckCheck, CheckCircle2 } from "lucide-react";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import { OriginTag } from "@/components/statements/OriginTag";
import type { StatementData } from "@/components/statements/types";
import { PhaseAdvanceButton } from "@/components/wizard/PhaseAdvanceButton";
import { requestOpenAnalysisSection } from "@/components/wizard/CollapsibleSection";
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
import { PestelGrid } from "./PestelGrid";
import { SegmentCards } from "./SegmentCards";
import { CompetitorCards } from "./CompetitorCards";
import { ResourceCards } from "./ResourceCards";
import { SwotMatrix } from "./SwotMatrix";

const ANCHORS = [
  { href: "#pestel", label: "PESTEL" },
  { href: "#zielgruppen", label: "Zielgruppen & Probleme" },
  { href: "#wettbewerb", label: "Wettbewerb" },
  { href: "#ressourcen", label: "Ressourcen" },
  { href: "#swot", label: "SWOT & Marktpfade" },
];

const SUMMARY_ITEMS = [
  {
    key: "facts",
    label: "Fakten",
    tone: "border-[#28b7a4] bg-[#e7f8f5] text-[#08796c]",
  },
  {
    key: "assumptions",
    label: "Annahmen",
    tone: "border-[#5aa7e8] bg-[#eef7ff] text-[#1d67a6]",
  },
  {
    key: "questions",
    label: "offene Fragen",
    tone: "border-[#f3a536] bg-[#fff5e8] text-[#a55b00]",
  },
] as const;

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
  const [activeAnchor, setActiveAnchor] = useState(ANCHORS[0].href);

  useEffect(() => {
    if (!statements.length || isGenerating) {
      return;
    }

    let frameId: number | null = null;

    function updateActiveAnchorFromScroll() {
      frameId = null;
      const markerY = 170;
      let currentAnchor = ANCHORS[0].href;

      for (const anchor of ANCHORS) {
        const section = document.getElementById(anchor.href.slice(1));

        if (!section) {
          continue;
        }

        if (section.getBoundingClientRect().top <= markerY) {
          currentAnchor = anchor.href;
        }
      }

      setActiveAnchor((current) =>
        current === currentAnchor ? current : currentAnchor
      );
    }

    function scheduleUpdate() {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(updateActiveAnchorFromScroll);
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [isGenerating, statements.length]);

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
  const summaryCounts = {
    facts: factCount,
    assumptions: assumptionCount,
    questions: questionCount,
  };
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
          <div className="sticky top-0 z-10 -mx-1 overflow-hidden rounded-[14px] border border-border/80 bg-surface shadow-[0_12px_32px_rgba(31,36,33,0.12)]">
            <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[31rem]">
                {SUMMARY_ITEMS.map((item) => (
                  <div
                    key={item.key}
                    className="flex min-h-12 items-center gap-3 rounded-[10px] border border-border/70 bg-background/60 px-3"
                  >
                    <span
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border text-sm font-semibold ${item.tone}`}
                    >
                      {summaryCounts[item.key]}
                    </span>
                    <span className="text-xs font-semibold text-text">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center lg:justify-end">
                {draftCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleAdoptAll}
                    disabled={isAdoptingAll}
                    className="inline-flex min-h-10 items-center gap-2 rounded-[9px] bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent/90 disabled:opacity-50"
                  >
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                    <span className="leading-tight">
                      {isAdoptingAll
                        ? "Wird übernommen ..."
                        : `Alle Entwürfe übernehmen (${draftCount})`}
                    </span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-3 text-xs font-bold leading-tight text-[#16864f]">
                    <CheckCircle2
                      className="h-8 w-8 shrink-0 fill-[#36aa55] text-white"
                      aria-hidden
                    />
                    <span className="max-w-28">Alle Aussagen übernommen</span>
                  </span>
                )}
              </div>
            </div>
            <nav
              aria-label="Abschnitte"
              className="flex min-w-0 overflow-x-auto border-t border-border/80 px-3 text-xs font-semibold"
            >
              {ANCHORS.map((anchor, index) => (
                <div
                  key={anchor.href}
                  className="flex min-w-max flex-1 items-stretch"
                >
                  {index > 0 && (
                    <span
                      className="my-3 w-px shrink-0 bg-border"
                      aria-hidden
                    />
                  )}
                  <a
                    href={anchor.href}
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveAnchor(anchor.href);

                      const sectionId = anchor.href.slice(1);
                      requestOpenAnalysisSection(sectionId);
                      // SWOT nav also reveals the related market-paths block.
                      if (sectionId === "swot") {
                        requestOpenAnalysisSection("marktpfade");
                      }

                      const section = document.getElementById(sectionId);
                      if (section) {
                        const reduceMotion = window.matchMedia(
                          "(prefers-reduced-motion: reduce)"
                        ).matches;
                        section.scrollIntoView({
                          behavior: reduceMotion ? "auto" : "smooth",
                          block: "start",
                        });
                      }

                      window.history.replaceState(null, "", anchor.href);
                    }}
                    className={`relative flex min-h-14 w-full items-center justify-center px-4 text-center transition-colors hover:text-accent ${
                      activeAnchor === anchor.href
                        ? "text-accent"
                        : "text-text hover:bg-accent-soft/35"
                    }`}
                  >
                    {anchor.label}
                    {activeAnchor === anchor.href && (
                      <span
                        className="absolute inset-x-4 bottom-0 h-1 rounded-t-full bg-accent"
                        aria-hidden
                      />
                    )}
                  </a>
                </div>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-3">
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

            <ResourceCards
              projectId={project.id}
              statements={resources}
              onChanged={handleChanged}
              onDeleted={handleDeleted}
              onAdded={handleAdded}
            />

            <SwotMatrix
              projectId={project.id}
              statements={byCategory("SWOT_")}
              marketPaths={byCategory("MARKET_PATH")}
              onChanged={handleChanged}
              onDeleted={handleDeleted}
              onAdded={handleAdded}
            />
          </div>
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
