import type {
  AggregationStrategy,
  EvaluationMode,
  KpiAssessment,
  MetricValueType,
} from "@prisma/client";
import {
  metricEvaluationConfigSchema,
  type MetricEvaluationConfig,
} from "@/lib/schemas/metric";

export type MetricPointInput = {
  periodLabel: string;
  value?: string | null;
  numerator?: number | null;
  denominator?: number | null;
  assessment?: KpiAssessment;
};

export type MetricAggregationInput = {
  name: string;
  evaluationMode?: EvaluationMode | null;
  valueType?: MetricValueType | null;
  aggregationStrategy?: AggregationStrategy | null;
  evaluationConfig?: unknown;
  numeratorLabel?: string | null;
  denominatorLabel?: string | null;
  observationUnit?: string | null;
};

export type AggregatedPeriodResult = {
  periodLabel: string;
  periodDisplayValue: string;
  cumulativeDisplayValue: string;
  numerator?: number;
  denominator?: number;
  value?: number;
};

export type AggregatedMetricResult = {
  valueType: MetricValueType;
  aggregationStrategy: AggregationStrategy;
  periodCount: number;
  observationCount?: number;
  value?: number;
  numerator?: number;
  denominator?: number;
  ratio?: number;
  percentage?: number;
  assessment: KpiAssessment;
  isComplete: boolean;
  isValid: boolean;
  displayValue: string;
  explanation: string;
  periods: AggregatedPeriodResult[];
  errors: string[];
};

const numberFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});
const percentageFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatPercentage(value: number): string {
  return `${percentageFormatter.format(value)} %`;
}

function parseCanonicalValue(value: string | null | undefined): number | null {
  if (value == null) return null;
  const normalized = value.trim().replace(",", ".");
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveSemantics(metric: MetricAggregationInput): {
  valueType: MetricValueType;
  aggregationStrategy: AggregationStrategy;
} {
  return {
    valueType: metric.valueType ?? "SCALAR",
    aggregationStrategy:
      metric.aggregationStrategy ??
      (metric.evaluationMode === "CUMULATIVE" ? "SUM" : "LATEST"),
  };
}

function parseEvaluationConfig(value: unknown): MetricEvaluationConfig | null {
  const parsed = metricEvaluationConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function compare(
  actual: number,
  operator: MetricEvaluationConfig["success"]["operator"],
  expected: number
): boolean {
  switch (operator) {
    case "GTE":
      return actual >= expected;
    case "GT":
      return actual > expected;
    case "LTE":
      return actual <= expected;
    case "LT":
      return actual < expected;
    case "EQ":
      return actual === expected;
  }
}

function ruleMatches(
  rule: MetricEvaluationConfig["success"],
  result: Pick<
    AggregatedMetricResult,
    "value" | "numerator" | "ratio" | "percentage"
  >
): boolean {
  if (rule.value !== undefined && result.value !== undefined) {
    return compare(result.value, rule.operator, rule.value);
  }
  if (rule.numerator !== undefined && result.numerator !== undefined) {
    return compare(result.numerator, rule.operator, rule.numerator);
  }
  if (rule.ratio !== undefined && result.ratio !== undefined) {
    return compare(result.ratio, rule.operator, rule.ratio);
  }
  if (rule.percentage !== undefined && result.percentage !== undefined) {
    return compare(result.percentage, rule.operator, rule.percentage);
  }
  return false;
}

function ratioDisplay(
  numerator: number,
  denominator: number,
  observationUnit?: string | null,
  includePercentage = true
): string {
  const unit = observationUnit?.trim() ? ` ${observationUnit.trim()}` : "";
  const percentage = denominator > 0 ? (numerator / denominator) * 100 : 0;
  return `${formatNumber(numerator)} von ${formatNumber(denominator)}${unit}${
    includePercentage ? ` (${formatPercentage(percentage)})` : ""
  }`;
}

function scalarDisplay(value: number, valueType: MetricValueType): string {
  if (valueType === "PERCENTAGE") return formatPercentage(value);
  return formatNumber(value);
}

function invalidResult(
  metric: MetricAggregationInput,
  points: MetricPointInput[],
  valueType: MetricValueType,
  aggregationStrategy: AggregationStrategy,
  errors: string[]
): AggregatedMetricResult {
  const legacyError =
    "Dieser ältere Datenpunkt enthält keine getrennten oder kanonisch numerischen Angaben und kann deshalb nicht zuverlässig kumuliert werden.";
  return {
    valueType,
    aggregationStrategy,
    periodCount: points.length,
    assessment: "PENDING",
    isComplete: false,
    isValid: false,
    displayValue: "Nicht zuverlässig auswertbar",
    explanation: errors[0] ?? legacyError,
    periods: points.map((point) => ({
      periodLabel: point.periodLabel,
      periodDisplayValue: point.value ?? "Ungültiger Verhältniswert",
      cumulativeDisplayValue: "Nicht zuverlässig auswertbar",
    })),
    errors: errors.length > 0 ? errors : [legacyError],
  };
}

/**
 * The single domain source for KPI aggregation. It only accepts canonical scalar
 * values or explicit numerator/denominator pairs and never parses labels or criteria.
 */
export function aggregateMetric(
  metric: MetricAggregationInput,
  points: MetricPointInput[]
): AggregatedMetricResult {
  const { valueType, aggregationStrategy } = resolveSemantics(metric);
  const errors: string[] = [];
  const expectsRatio =
    aggregationStrategy === "RATE_FROM_SUMS" ||
    valueType === "COUNT_OF_TOTAL";

  if (
    valueType === "COUNT_OF_TOTAL" &&
    !["RATE_FROM_SUMS", "LATEST", "NONE"].includes(aggregationStrategy)
  ) {
    errors.push(
      "COUNT_OF_TOTAL unterstützt RATE_FROM_SUMS, LATEST oder NONE."
    );
  }
  if (valueType === "PERCENTAGE" && aggregationStrategy === "SUM") {
    errors.push("Prozentwerte dürfen nicht addiert werden.");
  }

  const scalarValues: number[] = [];
  const ratioValues: { numerator: number; denominator: number }[] = [];

  points.forEach((point, index) => {
    const pointName = point.periodLabel || `Datenpunkt ${index + 1}`;
    const hasValue = point.value != null;
    const hasNumerator = point.numerator != null;
    const hasDenominator = point.denominator != null;

    if (expectsRatio) {
      if (hasValue || !hasNumerator || !hasDenominator) {
        errors.push(
          `${pointName}: Für diese Messgröße müssen Treffer und Beobachtungen getrennt eingegeben werden.`
        );
        return;
      }
      const numerator = point.numerator!;
      const denominator = point.denominator!;
      if (
        !Number.isFinite(numerator) ||
        !Number.isFinite(denominator) ||
        numerator < 0 ||
        denominator <= 0 ||
        numerator > denominator
      ) {
        errors.push(
          `${pointName}: Treffer und Beobachtungen bilden kein gültiges Verhältnis.`
        );
        return;
      }
      ratioValues.push({ numerator, denominator });
      return;
    }

    if (hasNumerator || hasDenominator) {
      errors.push(
        `${pointName}: Verhältniswerte dürfen nicht mit einfachen Einzelwerten vermischt werden.`
      );
      return;
    }
    const value = parseCanonicalValue(point.value);
    if (value === null) {
      errors.push(
        `${pointName}: Der ältere Freitextwert ist nicht eindeutig numerisch auswertbar.`
      );
      return;
    }
    scalarValues.push(value);
  });

  if (errors.length > 0) {
    return invalidResult(
      metric,
      points,
      valueType,
      aggregationStrategy,
      errors
    );
  }

  let value: number | undefined;
  let numerator: number | undefined;
  let denominator: number | undefined;
  let ratio: number | undefined;
  let percentage: number | undefined;
  const periods: AggregatedPeriodResult[] = [];

  if (expectsRatio) {
    let runningNumerator = 0;
    let runningDenominator = 0;
    ratioValues.forEach((point, index) => {
      if (aggregationStrategy === "RATE_FROM_SUMS") {
        runningNumerator += point.numerator;
        runningDenominator += point.denominator;
      } else {
        runningNumerator = point.numerator;
        runningDenominator = point.denominator;
      }
      periods.push({
        periodLabel: points[index]!.periodLabel,
        periodDisplayValue: ratioDisplay(
          point.numerator,
          point.denominator,
          null,
          false
        ),
        cumulativeDisplayValue: ratioDisplay(
          runningNumerator,
          runningDenominator,
          null,
          false
        ),
        numerator: point.numerator,
        denominator: point.denominator,
      });
    });
    if (aggregationStrategy !== "NONE") {
      numerator = runningNumerator;
      denominator = runningDenominator;
    }
    ratio =
      numerator !== undefined &&
      denominator !== undefined &&
      denominator > 0
        ? numerator / denominator
        : undefined;
    percentage = ratio === undefined ? undefined : ratio * 100;
  } else if (aggregationStrategy !== "NONE" && scalarValues.length > 0) {
    let runningSum = 0;
    scalarValues.forEach((point, index) => {
      runningSum += point;
      const cumulative =
        aggregationStrategy === "SUM"
          ? runningSum
          : aggregationStrategy === "AVERAGE"
            ? runningSum / (index + 1)
            : point;
      periods.push({
        periodLabel: points[index]!.periodLabel,
        periodDisplayValue: scalarDisplay(point, valueType),
        cumulativeDisplayValue: scalarDisplay(cumulative, valueType),
        value: point,
      });
    });
    if (aggregationStrategy === "SUM") {
      value = scalarValues.reduce((sum, item) => sum + item, 0);
    } else if (aggregationStrategy === "AVERAGE") {
      value =
        scalarValues.reduce((sum, item) => sum + item, 0) / scalarValues.length;
    } else {
      value = scalarValues.at(-1);
    }
    if (valueType === "PERCENTAGE") percentage = value;
  } else {
    scalarValues.forEach((point, index) => {
      periods.push({
        periodLabel: points[index]!.periodLabel,
        periodDisplayValue: scalarDisplay(point, valueType),
        cumulativeDisplayValue: "Keine Gesamtaggregation",
        value: point,
      });
    });
    value = scalarValues.at(-1);
    if (valueType === "PERCENTAGE") percentage = value;
  }

  const config = parseEvaluationConfig(metric.evaluationConfig);
  const observationCount = denominator;
  const sampleComplete = config
    ? config.requiredDenominator !== undefined
      ? denominator !== undefined &&
        denominator >= config.requiredDenominator
      : config.requiredObservations !== undefined
        ? observationCount !== undefined &&
          observationCount >= config.requiredObservations
        : points.length > 0
    : false;

  const partialResult = { value, numerator, ratio, percentage };
  let assessment: KpiAssessment = "PENDING";
  if (config && sampleComplete) {
    if (ruleMatches(config.success, partialResult)) {
      assessment = "SUPPORTING";
    } else if (ruleMatches(config.failure, partialResult)) {
      assessment = "CONTRADICTING";
    } else {
      assessment = "NEUTRAL";
    }
  }

  const displayValue =
    numerator !== undefined && denominator !== undefined
      ? ratioDisplay(
          numerator,
          denominator,
          metric.observationUnit,
          true
        )
      : value !== undefined
        ? scalarDisplay(value, valueType)
        : "Keine Gesamtaggregation";

  const explanation = !config
    ? "Für diese Messgröße fehlt eine strukturierte Bewertungsregel; die Werte werden angezeigt, aber nicht aus Freitext bewertet."
    : !sampleComplete
      ? "Noch nicht abschließend bewertbar"
      : assessment === "SUPPORTING"
        ? "Der strukturierte Erfolgsschwellenwert wurde erreicht."
        : assessment === "CONTRADICTING"
          ? "Der strukturierte Misserfolgsschwellenwert wurde erreicht."
          : "Das Ergebnis liegt zwischen Erfolgs- und Misserfolgsschwelle.";

  return {
    valueType,
    aggregationStrategy,
    periodCount: points.length,
    observationCount,
    value,
    numerator,
    denominator,
    ratio,
    percentage,
    assessment,
    isComplete: sampleComplete,
    isValid: true,
    displayValue,
    explanation,
    periods,
    errors: [],
  };
}

export function validateMetricDataPoint(
  metric: MetricAggregationInput,
  point: MetricPointInput
): string[] {
  return aggregateMetric(metric, [point]).errors;
}
