"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import {
  CRITERION_ORDER,
  type EvaluatedOption,
  type EvaluationData,
} from "./types";

function ScoreCell({
  score,
  rationale,
  optionTitle,
  criterionLabel,
}: {
  score: number;
  rationale: string;
  optionTitle: string;
  criterionLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const anchorRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCloseTimeout() {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }

  function show() {
    clearCloseTimeout();
    setOpen(true);
  }

  function scheduleHide() {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 80);
  }

  function updatePosition() {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    const tooltipHeight = tooltip?.offsetHeight ?? 0;
    const tooltipWidth = tooltip?.offsetWidth ?? 256;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placeAbove =
      tooltipHeight > 0
        ? spaceBelow < tooltipHeight + gap && spaceAbove >= tooltipHeight + gap
        : false;

    const top = placeAbove
      ? rect.top - tooltipHeight - gap
      : rect.bottom + gap;
    const maxLeft = window.innerWidth - tooltipWidth - 8;
    const left = Math.max(8, Math.min(rect.left, maxLeft));

    setCoords({ top, left });
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleReposition() {
      updatePosition();
    }

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimeout(), []);

  return (
    <>
      <div
        ref={anchorRef}
        className="relative flex items-center gap-2"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
      >
        <div
          role="img"
          aria-label={`${score} von 5 Punkten`}
          className="flex gap-1"
        >
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              aria-hidden
              className={`h-2 w-2 rounded-full ${
                step <= score ? "bg-accent" : "bg-border"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`Begründung für ${criterionLabel} bei ${optionTitle} anzeigen`}
          className="rounded p-0.5 text-text-muted transition-colors hover:text-accent"
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={
              coords
                ? { top: coords.top, left: coords.left }
                : { top: -9999, left: -9999 }
            }
            onMouseEnter={show}
            onMouseLeave={scheduleHide}
            className="fixed z-50 w-64 rounded-md border border-border bg-surface p-3 text-left text-xs leading-relaxed text-text shadow-sm"
          >
            <p className="mb-1 font-medium">
              {criterionLabel} — Score {score}/5
            </p>
            <p className="text-text-muted">{rationale}</p>
          </div>,
          document.body
        )}
    </>
  );
}

export function EvaluationMatrix({
  options,
  evaluations,
}: {
  options: EvaluatedOption[];
  evaluations: EvaluationData[];
}) {
  return (
    <section aria-label="Bewertungsmatrix">
      <h3 className="font-heading text-base font-medium text-text">
        Bewertungsmatrix
      </h3>
      <p className="mt-1 text-xs text-text-muted">
        Sechs Kriterien je Option, Score 1–5 (5 = am besten). Beim Überfahren
        des Info-Symbols erscheint die Begründung der KI.
      </p>
      <div className="mt-3 overflow-x-auto rounded-[10px] border border-border bg-surface">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted"
              >
                Kriterium
              </th>
              {options.map((option) => (
                <th
                  scope="col"
                  key={option.id}
                  className="px-4 py-3 text-left font-heading text-sm font-medium text-text"
                >
                  {option.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRITERION_ORDER.map(({ criterion, label }, rowIndex) => (
              <tr
                key={criterion}
                className={[
                  rowIndex % 2 === 0 ? "bg-[#F2F7F3]" : "bg-[#F3F3F0]",
                  rowIndex < CRITERION_ORDER.length - 1
                    ? "border-b border-border/70"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <th
                  scope="row"
                  className="px-4 py-3 text-left text-sm font-medium text-text"
                >
                  {label}
                </th>
                {options.map((option) => {
                  const evaluation = evaluations.find(
                    (candidate) =>
                      candidate.optionId === option.id &&
                      candidate.criterion === criterion
                  );
                  return (
                    <td key={option.id} className="px-4 py-3">
                      {evaluation ? (
                        <ScoreCell
                          score={evaluation.score}
                          rationale={evaluation.rationale}
                          optionTitle={option.title}
                          criterionLabel={label}
                        />
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
