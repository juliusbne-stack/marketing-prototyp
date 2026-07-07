"use client";

import { useEffect, useState } from "react";
import { Check, Copy, LoaderCircle, Sparkles } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";
import type { TaskElaborationResponse } from "@/lib/schemas/taskElaboration";

const QUICK_CHIPS = [
  "Lockerer Ton",
  "Seriöser",
  "Kürzer",
  "Mehr lokal",
  "Weniger Werbesprech",
  "Mehr Nutzen betonen",
] as const;

type CopyRound = {
  feedback: string;
  resultPreview: string;
};

function CopySnippet({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable — fail silently.
    }
  }

  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-surface px-3 py-2">
      <p className="flex-1 text-[13px] text-text">{text}</p>
      <button
        type="button"
        onClick={handleCopy}
        title="In Zwischenablage kopieren"
        className="shrink-0 rounded p-1 text-text-muted transition-colors hover:bg-background hover:text-accent"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
    </div>
  );
}

export function CopyRefinementSection({
  taskId,
  snippets,
  onUpdated,
}: {
  taskId: string;
  snippets: string[];
  onUpdated: (elaboration: TaskElaborationResponse) => void;
}) {
  const [localSnippets, setLocalSnippets] = useState(snippets);
  const [refineOpen, setRefineOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rounds, setRounds] = useState<CopyRound[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalSnippets(snippets);
  }, [snippets]);

  function appendChip(chip: string) {
    setFeedback((current) => {
      const trimmed = current.trim();
      if (!trimmed) return chip;
      return `${trimmed.replace(/[.;]$/, "")}; ${chip}`;
    });
  }

  async function handleRefine() {
    if (!feedback.trim()) return;
    setIsRefining(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/implementation/tasks/${taskId}/refine-copy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedback: feedback.trim(),
            previousRounds: rounds,
          }),
        }
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          body?.error ??
            "Die Formulierungsvorschläge konnten nicht überarbeitet werden. Erneut versuchen."
        );
      }

      const nextSnippets: string[] = body.formulierungsvorschlaege;
      setLocalSnippets(nextSnippets);
      if (body.elaboration) {
        onUpdated(body.elaboration);
      }
      setRounds((current) => [
        ...current,
        {
          feedback: feedback.trim(),
          resultPreview: nextSnippets[0] ?? "",
        },
      ]);
      setFeedback("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Formulierungsvorschläge konnten nicht überarbeitet werden. Erneut versuchen."
      );
    } finally {
      setIsRefining(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          Formulierungsvorschläge
        </p>
        <button
          type="button"
          onClick={() => setRefineOpen((open) => !open)}
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          aria-expanded={refineOpen}
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Ton anpassen
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {localSnippets.map((snippet) => (
          <CopySnippet key={snippet} text={snippet} />
        ))}
      </div>

      {refineOpen && (
        <div className="mt-3 rounded-md border border-dashed border-border bg-surface p-3">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Copy mit KI anpassen
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Beschreibe, wie die Texte klingen sollen — die KI überarbeitet nur
            die Formulierungsvorschläge, nicht das restliche Arbeitspaket.
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => appendChip(chip)}
                disabled={isRefining}
                className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            disabled={isRefining}
            rows={3}
            placeholder="z. B. Die Copy soll lockerer klingen, weniger SaaS, mehr wie ein Café aus der Nachbarschaft."
            className="mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-[13px] text-text placeholder:text-text-muted/70 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProgressButton
              type="button"
              onClick={handleRefine}
              loading={isRefining}
              loadingLabel="Formulierungen werden überarbeitet …"
              disabled={!feedback.trim()}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Neu formulieren
            </ProgressButton>
            {isRefining && (
              <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                KI-Vorschlag — bitte prüfen
              </span>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
        </div>
      )}
    </div>
  );
}
