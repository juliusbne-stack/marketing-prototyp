"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { EvidenceStatus, Origin } from "@prisma/client";
import { StatementCard } from "@/components/statements/StatementCard";
import type { StatementData } from "@/components/statements/types";

const EVIDENCE_OPTIONS: { value: EvidenceStatus; label: string }[] = [
  { value: "FACT", label: "Fakt" },
  { value: "ASSUMPTION", label: "Annahme" },
  { value: "OPEN_QUESTION", label: "Offene Frage" },
];

const ORIGIN_OPTIONS: { value: Origin; label: string }[] = [
  { value: "USER_INPUT", label: "Nutzer" },
  { value: "SIMULATED_RESEARCH", label: "Recherche (fiktiv)" },
  { value: "AI_DERIVATION", label: "KI-Ableitung" },
];

const EMPTY_FORM = {
  content: "",
  evidenceStatus: "ASSUMPTION" as EvidenceStatus,
  origin: "USER_INPUT" as Origin,
  justification: "",
  sourceRef: "",
  uncertainty: "",
};

export function StatementDemo({
  projectId,
  initialStatements,
}: {
  projectId: string;
  initialStatements: StatementData[];
}) {
  const [statements, setStatements] = useState(initialStatements);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          phase: 1,
          content: form.content.trim(),
          evidenceStatus: form.evidenceStatus,
          origin: form.origin,
          justification: form.justification.trim() || undefined,
          sourceRef: form.sourceRef.trim() || undefined,
          uncertainty: form.uncertainty.trim() || undefined,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "Die Aussage konnte nicht angelegt werden. Erneut versuchen — deine Eingaben bleiben erhalten."
        );
      }
      const created: StatementData = await response.json();
      setStatements((current) => [...current, created]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die Aussage konnte nicht angelegt werden. Erneut versuchen — deine Eingaben bleiben erhalten."
      );
    } finally {
      setIsSubmitting(false);
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

  const inputClasses =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted";

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-[10px] border border-border bg-surface p-4">
        <h3 className="font-heading text-base font-medium text-text">
          Aussage hinzufügen
        </h3>
        <p className="mt-1 text-xs text-text-muted">
          Demo-Ansicht zum Testen der Kernkomponente: Lege Aussagen an, ändere
          ihren Evidenzstatus über das Badge und übernimm sie in den
          Projektstand.
        </p>

        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3">
          <textarea
            value={form.content}
            onChange={(event) =>
              setForm({ ...form, content: event.target.value })
            }
            rows={2}
            placeholder="Inhalt der Aussage, z. B. „Berufstätige 25–45 in Großstädten buchen Kurse spontan.“"
            aria-label="Inhalt der Aussage"
            className={inputClasses}
            disabled={isSubmitting}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
              Evidenzstatus
              <select
                value={form.evidenceStatus}
                onChange={(event) =>
                  setForm({
                    ...form,
                    evidenceStatus: event.target.value as EvidenceStatus,
                  })
                }
                className={inputClasses}
                disabled={isSubmitting}
              >
                {EVIDENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
              Herkunft
              <select
                value={form.origin}
                onChange={(event) =>
                  setForm({ ...form, origin: event.target.value as Origin })
                }
                className={inputClasses}
                disabled={isSubmitting}
              >
                {ORIGIN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <details className="text-xs text-text-muted">
            <summary className="cursor-pointer font-medium">
              Optional: Begründung, Quelle, Unsicherheit
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="text"
                value={form.justification}
                onChange={(event) =>
                  setForm({ ...form, justification: event.target.value })
                }
                placeholder="Begründung"
                aria-label="Begründung"
                className={inputClasses}
                disabled={isSubmitting}
              />
              <input
                type="text"
                value={form.sourceRef}
                onChange={(event) =>
                  setForm({ ...form, sourceRef: event.target.value })
                }
                placeholder="Quelle, z. B. „Studio-Booking-Trends 2025 (fiktiv)“"
                aria-label="Quelle"
                className={inputClasses}
                disabled={isSubmitting}
              />
              <input
                type="text"
                value={form.uncertainty}
                onChange={(event) =>
                  setForm({ ...form, uncertainty: event.target.value })
                }
                placeholder="Unsicherheitshinweis"
                aria-label="Unsicherheitshinweis"
                className={inputClasses}
                disabled={isSubmitting}
              />
            </div>
          </details>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !form.content.trim()}
              className="inline-flex items-center gap-1.5 self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {isSubmitting ? "Wird angelegt …" : "Aussage hinzufügen"}
            </button>
            {error && <p className="text-xs text-danger-text">{error}</p>}
          </div>
        </form>
      </section>

      <section>
        <h3 className="mb-3 font-heading text-base font-medium text-text">
          Aussagen ({statements.length})
        </h3>
        {statements.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
            Noch keine Aussagen vorhanden. Lege oben die erste Aussage an — sie
            erscheint hier als Entwurf und kann übernommen werden.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {statements.map((statement) => (
              <StatementCard
                key={statement.id}
                statement={statement}
                onChanged={handleChanged}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
