"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, MessageCircle, Send, Sparkles, X } from "lucide-react";
import type { StatementData } from "@/components/statements/types";
import {
  buildSignalMetricsPatchBody,
  buildStepScalarPatchBody,
  buildStrategyAssistantKontext,
  degradationMessage,
  getContextualQuestionChips,
  normalizeStepFromStepsApi,
  vorschlagLabel,
  type AdoptedAussageInput,
} from "@/lib/phase4/strategyAssistant";
import type {
  AssistentAntwort,
  Nachricht,
  Vorschlag,
} from "@/lib/schemas/strategyAssistant";
import { TextChangeProposalCard } from "./TextChangeProposalCard";
import { ValidationRefinementPanel } from "./ValidationRefinementPanel";
import type { AssistantTaskData, StepData } from "./types";

const REFINEMENT_CHIP = "Validierung komplett überarbeiten";

type AssistantMessage =
  | { id: string; rolle: "user"; inhalt: string }
  | {
      id: string;
      rolle: "assistant";
      antwort: AssistentAntwort;
      adopted?: boolean;
      discarded?: boolean;
    };

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toVerlauf(nachrichten: AssistantMessage[]): Nachricht[] {
  return nachrichten.map((entry) => {
    if (entry.rolle === "user") {
      return { rolle: "user", inhalt: entry.inhalt };
    }
    if (entry.antwort.modus === "antwort") {
      return { rolle: "assistant", inhalt: entry.antwort.nachricht };
    }
    return {
      rolle: "assistant",
      inhalt: `${entry.antwort.nachricht}\n[Vorschlag für ${entry.antwort.vorschlag.ziel.typ}]`,
    };
  });
}

export function StrategieAssistentPanel({
  projectId,
  assumption,
  step,
  tasks,
  adoptedAussagen,
  onAssumptionChanged,
  onTaskChanged,
  onStepChanged,
  onRefinementAdopted,
  onClose,
}: {
  projectId: string;
  assumption: StatementData;
  step: StepData;
  tasks: AssistantTaskData[];
  adoptedAussagen: AdoptedAussageInput[];
  onAssumptionChanged: (statement: StatementData) => void;
  onTaskChanged: (task: AssistantTaskData) => void;
  onStepChanged: (step: StepData) => void;
  onRefinementAdopted: (result: {
    step: StepData;
    assumption: StatementData;
    archivedStepId: string | null;
  }) => void;
  onClose: () => void;
}) {
  const [nachrichten, setNachrichten] = useState<AssistantMessage[]>([]);
  const [eingabe, setEingabe] = useState("");
  const [istLaden, setIstLaden] = useState(false);
  const [adoptingId, setAdoptingId] = useState<string | null>(null);
  const [refinementOpen, setRefinementOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const kontext = useMemo(
    () =>
      buildStrategyAssistantKontext({
        assumption,
        step,
        tasks,
        adoptedAussagen,
        hasKpiDataPoints: step.hasKpiDataPoints ?? false,
      }),
    [assumption, step, tasks, adoptedAussagen]
  );

  const chips = useMemo(
    () => getContextualQuestionChips(step.stepType),
    [step.stepType]
  );

  useEffect(() => {
    if (refinementOpen) return;
    const timeout = window.setTimeout(() => {
      inputRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      inputRef.current?.focus({ preventScroll: true });
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [refinementOpen]);

  function handleCloseRequest() {
    if (refinementOpen) {
      setRefinementOpen(false);
      return;
    }
    onClose();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (refinementOpen) {
        setRefinementOpen(false);
      } else {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [refinementOpen, onClose]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || istLaden) return;

    const userMessage: AssistantMessage = {
      id: nextId(),
      rolle: "user",
      inhalt: trimmed,
    };
    const nextMessages = [...nachrichten, userMessage];
    setNachrichten(nextMessages);
    setEingabe("");
    setIstLaden(true);

    try {
      const response = await fetch("/api/implementation/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kontext,
          verlauf: toVerlauf(nextMessages),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Der Strategie Assistent konnte nicht antworten. Erneut versuchen."
        );
      }
      const antwort = body as AssistentAntwort;
      setNachrichten((current) => [
        ...current,
        { id: nextId(), rolle: "assistant", antwort },
      ]);
    } catch (error) {
      setNachrichten((current) => [
        ...current,
        {
          id: nextId(),
          rolle: "assistant",
          antwort: {
            modus: "antwort",
            nachricht:
              error instanceof Error
                ? error.message
                : "Der Strategie Assistent konnte nicht antworten. Erneut versuchen.",
          },
        },
      ]);
    } finally {
      setIstLaden(false);
      window.setTimeout(() => {
        listRef.current?.lastElementChild?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 50);
    }
  }

  async function handleAdopt(messageId: string, vorschlag: Vorschlag) {
    setAdoptingId(messageId);
    try {
      const ziel = vorschlag.ziel;

      if (ziel.typ === "signal" && !kontext.schritt.signaleBearbeitbar) {
        throw new Error(degradationMessage("invalid"));
      }

      let response: Response;

      if (ziel.typ === "annahme") {
        response = await fetch("/api/statements", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: assumption.id,
            content: vorschlag.nachher,
          }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            body?.error ??
              "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
          );
        }
        onAssumptionChanged(body);
      } else if (ziel.typ === "task") {
        const taskId = ziel.taskId;
        const task = tasks.find((entry) => entry.id === taskId);
        if (!task) {
          throw new Error("Die Aufgabe wurde nicht gefunden.");
        }
        const patchData: Record<string, unknown> = { id: task.id };
        if (task.erfolgskriterium && vorschlag.vorher === task.erfolgskriterium) {
          patchData.erfolgskriterium = vorschlag.nachher;
        } else {
          patchData.title = vorschlag.nachher;
        }
        response = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchData),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            body?.error ??
              "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
          );
        }
        onTaskChanged({
          id: body.id,
          text: body.title,
          erfolgskriterium: body.erfolgskriterium ?? null,
          annahmenBezugId: body.annahmenBezugId ?? null,
        });
      } else if (ziel.typ === "step") {
        response = await fetch("/api/steps", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildStepScalarPatchBody(step, ziel.feld, vorschlag.nachher)
          ),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            body?.error ??
              "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
          );
        }
        onStepChanged(normalizeStepFromStepsApi(step, body));
      } else if (ziel.typ === "signal") {
        response = await fetch("/api/steps", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildSignalMetricsPatchBody(
              step,
              ziel.metricId,
              ziel.feld,
              vorschlag.nachher
            )
          ),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            body?.error ??
              "Die Änderung konnte nicht gespeichert werden. Erneut versuchen."
          );
        }
        onStepChanged(normalizeStepFromStepsApi(step, body));
      } else {
        throw new Error(degradationMessage("invalid"));
      }

      setNachrichten((current) =>
        current.map((entry) =>
          entry.id === messageId && entry.rolle === "assistant"
            ? { ...entry, adopted: true }
            : entry
        )
      );
    } catch (error) {
      setNachrichten((current) => [
        ...current,
        {
          id: nextId(),
          rolle: "assistant",
          antwort: {
            modus: "antwort",
            nachricht:
              error instanceof Error
                ? error.message
                : "Die Übernahme ist fehlgeschlagen. Erneut versuchen.",
          },
        },
      ]);
    } finally {
      setAdoptingId(null);
    }
  }

  function handleDiscard(messageId: string) {
    setNachrichten((current) =>
      current.map((entry) =>
        entry.id === messageId && entry.rolle === "assistant"
          ? { ...entry, discarded: true }
          : entry
      )
    );
  }

  return (
    <div className="rounded-[10px] border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            Strategie Assistent
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Beratung, punktuelle Textvorschläge und — bei Bedarf — eine vollständige
            Überarbeitung von Annahme, Test und Signalen. Nichts wird ohne deine
            Bestätigung geändert.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCloseRequest}
          aria-label="Strategie Assistent schließen"
          title="Schließen"
          className="shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {refinementOpen ? (
        <div className="mt-3">
          <ValidationRefinementPanel
            projectId={projectId}
            step={step}
            assumption={assumption}
            onAdopted={(result) => {
              onRefinementAdopted(result);
              setRefinementOpen(false);
            }}
            onClose={() => setRefinementOpen(false)}
          />
        </div>
      ) : (
        <>
      {nachrichten.length > 0 && (
        <div
          ref={listRef}
          className="mt-3 flex max-h-96 flex-col gap-3 overflow-y-auto pr-1"
        >
          {nachrichten.map((entry) => {
            if (entry.rolle === "user") {
              return (
                <div key={entry.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-[10px] bg-accent px-3 py-2 text-sm leading-relaxed text-white">
                    {entry.inhalt}
                  </p>
                </div>
              );
            }

            const { antwort } = entry;
            return (
              <div key={entry.id} className="flex flex-col gap-2">
                <p className="max-w-[92%] rounded-[10px] border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-text-muted">
                  {antwort.nachricht}
                </p>
                {antwort.modus === "vorschlag" && (
                  <TextChangeProposalCard
                    zielLabel={vorschlagLabel(
                      antwort.vorschlag,
                      tasks,
                      kontext.signale
                    )}
                    vorher={antwort.vorschlag.vorher}
                    nachher={antwort.vorschlag.nachher}
                    begruendung={antwort.vorschlag.begruendung}
                    adopted={entry.adopted}
                    discarded={entry.discarded}
                    isAdopting={adoptingId === entry.id}
                    onAdopt={() => void handleAdopt(entry.id, antwort.vorschlag)}
                    onDiscard={() => handleDiscard(entry.id)}
                  />
                )}
              </div>
            );
          })}
          {istLaden && (
            <p className="inline-flex items-center gap-2 text-sm text-text-muted">
              <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-hidden />
              Assistent denkt nach …
            </p>
          )}
        </div>
      )}

      {nachrichten.length === 0 && istLaden && (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-text-muted">
          <LoaderCircle className="h-4 w-4 animate-spin text-accent" aria-hidden />
          Assistent denkt nach …
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setRefinementOpen(true)}
          disabled={istLaden}
          className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent-soft/40 px-2.5 py-0.5 text-xs font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          {REFINEMENT_CHIP}
        </button>
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => void sendMessage(chip)}
            disabled={istLaden}
            className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={eingabe}
          onChange={(event) => setEingabe(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage(eingabe);
            }
          }}
          disabled={istLaden}
          rows={2}
          placeholder="Frage stellen oder konkrete Änderung anfordern …"
          className="min-h-[44px] flex-1 resize-y rounded-md border border-border bg-surface p-2 text-sm text-text placeholder:text-text-muted/70 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void sendMessage(eingabe)}
          disabled={istLaden || !eingabe.trim()}
          aria-label="Nachricht senden"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-accent text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </div>
        </>
      )}
    </div>
  );
}
