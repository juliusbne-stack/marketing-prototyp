"use client";

import type { ReactNode } from "react";
import { Target } from "lucide-react";
import type { TaskElaborationResponse } from "@/lib/schemas/taskElaboration";
import { StatementReferenceChip } from "./StatementReferenceChip";
import type { StatementRef } from "./types";

export function ElaborationContent({
  content,
  statementMap,
  onStepReject,
  formulierungsvorschlaegeSlot,
  showFormulierungsvorschlaege = false,
}: {
  content: TaskElaborationResponse;
  statementMap: Map<string, StatementRef>;
  onStepReject?: (stepTitle: string) => void;
  formulierungsvorschlaegeSlot?: ReactNode;
  showFormulierungsvorschlaege?: boolean;
}) {
  return (
    <>
      <p className="text-[13px] text-text">{content.einleitungssatz}</p>

      <ol className="mt-4 flex flex-col gap-3">
        {content.schritte.map((schritt, index) => (
          <li key={`${schritt.titel}-${index}`} className="group relative">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-text">
                {index + 1}. {schritt.titel}
              </p>
              {onStepReject && (
                <button
                  type="button"
                  onClick={() => onStepReject(schritt.titel)}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-text-muted opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
                >
                  Passt nicht
                </button>
              )}
            </div>
            <p className="mt-0.5 text-xs text-text-muted">{schritt.beschreibung}</p>
          </li>
        ))}
      </ol>

      {content.targeting.vorhanden && (
        <div className="mt-4 rounded-md bg-accent-soft/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Targeting-Spezifikation
          </p>
          <dl className="mt-2 grid gap-2 text-[13px]">
            <div>
              <dt className="font-medium text-text">Zielgruppe</dt>
              <dd className="text-text-muted">
                {content.targeting.spezifikation.zielgruppenbeschreibung}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-text">Demografie</dt>
              <dd className="text-text-muted">
                {content.targeting.spezifikation.demografie}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-text">Geografie</dt>
              <dd className="text-text-muted">
                {content.targeting.spezifikation.geografie}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-text">Interessen</dt>
              <dd className="text-text-muted">
                {content.targeting.spezifikation.interessen.join(", ")}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-text">Platzierung</dt>
              <dd className="text-text-muted">
                {content.targeting.spezifikation.platzierung}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-text-muted">{content.targeting.hinweis}</p>
          {content.targeting.basiertAufAussageIds.length > 0 && (
            <div className="mt-2">
              <p className="mb-1.5 text-[11px] text-text-muted">
                Grundlagen aus der Analyse
                <span className="text-text-muted/75">
                  {" "}
                  · Für den Wortlaut mit der Maus über die Badges fahren
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
              {content.targeting.basiertAufAussageIds.map((id) => {
                const statement = statementMap.get(id);
                if (!statement) return null;
                return (
                  <StatementReferenceChip
                    key={id}
                    displayNumber={statement.displayNumber}
                    evidenceStatus={statement.evidenceStatus}
                    content={statement.content}
                    prefix="Basiert auf:"
                  />
                );
              })}
              </div>
            </div>
          )}
        </div>
      )}

      {formulierungsvorschlaegeSlot}

      {!formulierungsvorschlaegeSlot &&
        showFormulierungsvorschlaege &&
        content.formulierungsvorschlaege.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Formulierungsvorschläge
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {content.formulierungsvorschlaege.map((snippet) => (
              <li
                key={snippet}
                className="rounded-md border border-border bg-surface px-3 py-2 text-[13px] text-text"
              >
                {snippet}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3 text-[13px]">
        <p className="inline-flex items-start gap-1.5 text-text-muted">
          <Target
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
            aria-hidden
          />
          <span>
            <span className="font-medium text-text">Erfolgskriterium:</span>{" "}
            {content.erfolgskriterium}
          </span>
        </p>
        <p className="text-text-muted">
          <span className="font-medium text-text">Zeitaufwand:</span>{" "}
          {content.benoetigteRessourcen.zeitaufwandGeschaetzt}
          <span className="mx-1.5 text-border">·</span>
          <span className="font-medium text-text">Tools:</span>{" "}
          {content.benoetigteRessourcen.tools.join(", ")}
          {content.benoetigteRessourcen.budgetanteil && (
            <>
              <span className="mx-1.5 text-border">·</span>
              <span className="font-medium text-text">Budgetanteil:</span>{" "}
              {content.benoetigteRessourcen.budgetanteil}
            </>
          )}
        </p>
      </div>

      {content.offeneFragen.length > 0 && (
        <div className="mt-4 rounded-md border border-evidence-question-border/40 bg-evidence-question-bg/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-evidence-question-text">
            Offene Fragen
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {content.offeneFragen.map((question) => (
              <li key={question} className="text-[13px] text-text">
                {question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
