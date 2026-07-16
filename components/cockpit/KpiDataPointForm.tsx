"use client";

import { useMemo, useState } from "react";
import { aggregateMetric } from "@/lib/metrics/aggregateMetric";
import type {
  CockpitMetricData,
  KpiDataPointData,
} from "@/components/cockpit/types";

function parseInput(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function KpiDataPointForm({
  metric,
  onSaved,
}: {
  metric: CockpitMetricData;
  onSaved: (points: KpiDataPointData[]) => void;
}) {
  const expectsRatio =
    metric.aggregationStrategy === "RATE_FROM_SUMS" ||
    metric.valueType === "COUNT_OF_TOTAL";
  const [periodLabel, setPeriodLabel] = useState(
    `Welle ${metric.dataPoints.length + 1}`
  );
  const [value, setValue] = useState("");
  const [numerator, setNumerator] = useState("");
  const [denominator, setDenominator] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previewPoint = useMemo(() => {
    if (expectsRatio) {
      const parsedNumerator = parseInput(numerator);
      const parsedDenominator = parseInput(denominator);
      if (parsedNumerator === null || parsedDenominator === null) return null;
      return {
        periodLabel,
        numerator: parsedNumerator,
        denominator: parsedDenominator,
        assessment: "PENDING" as const,
      };
    }
    const parsedValue = parseInput(value);
    if (parsedValue === null) return null;
    return {
      periodLabel,
      value: String(parsedValue),
      assessment: "PENDING" as const,
    };
  }, [denominator, expectsRatio, numerator, periodLabel, value]);

  const preview = previewPoint
    ? aggregateMetric(metric, [...metric.dataPoints, previewPoint])
    : null;
  const periodPreview = preview?.periods.at(-1);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!previewPoint || !preview?.isValid) {
      setError(
        preview?.errors[0] ??
          "Bitte gib einen vollständigen numerischen Periodenwert ein."
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = expectsRatio
        ? {
            metricId: metric.id,
            periodLabel,
            numerator: previewPoint.numerator,
            denominator: previewPoint.denominator,
          }
        : {
            metricId: metric.id,
            periodLabel,
            value: Number(previewPoint.value),
          };
      const response = await fetch("/api/kpi/data-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error ?? "Der Datenpunkt konnte nicht gespeichert werden.");
      }
      onSaved(result.dataPoints);
      setPeriodLabel(`Welle ${result.dataPoints.length + 1}`);
      setValue("");
      setNumerator("");
      setDenominator("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Der Datenpunkt konnte nicht gespeichert werden."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 rounded-md border border-border bg-surface p-2.5"
    >
      <p className="text-xs font-medium text-text">Periodenwert erfassen</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-text-muted">
          Erhebungswelle
          <input
            value={periodLabel}
            onChange={(event) => setPeriodLabel(event.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-text"
            required
          />
        </label>
        {expectsRatio ? (
          <>
            <label className="text-xs text-text-muted">
              {metric.numeratorLabel ?? "Treffer in dieser Periode"}
              <input
                type="number"
                min="0"
                step="any"
                value={numerator}
                onChange={(event) => setNumerator(event.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-text"
                required
              />
            </label>
            <label className="text-xs text-text-muted">
              {metric.denominatorLabel ?? "Beobachtungen in dieser Periode"}
              <input
                type="number"
                min="0.000001"
                step="any"
                value={denominator}
                onChange={(event) => setDenominator(event.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-text"
                required
              />
            </label>
          </>
        ) : (
          <label className="text-xs text-text-muted">
            Wert in dieser Periode
            <input
              type="number"
              step="any"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5 text-text"
              required
            />
          </label>
        )}
      </div>
      {periodPreview && preview && (
        <div className="mt-2 text-xs text-text-muted">
          <p>Diese Periode: {periodPreview.periodDisplayValue}</p>
          <p>Nach Speicherung kumuliert: {periodPreview.cumulativeDisplayValue}</p>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-kpi-contradicting-text">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded bg-accent px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {saving ? "Speichert …" : "Periodenwert speichern"}
      </button>
    </form>
  );
}
