import type {
  SignalCategoryValue,
  TestSubjectValue,
} from "@/lib/schemas/metric";
import type { EvidenceContract } from "./validationCoreTypes";

const ENGAGEMENT_VOCAB =
  /\b(like|likes|kommentar|kommentare|share|shares|engagement|impression|reichweite|reach|view|views|follower)\b/i;

const INDIRECT_PROXY_VOCAB =
  /\b(klick|ctr|klickrate|impression|reichweite|reach|cpc|cpm|engagement|like|share|kommentar|view|follower|sichtbarkeit)\b/i;

const DIRECT_NEED_VOCAB =
  /\b(problemdruck|problem.*bestätig|bedarf.*bestätig|relevanz.*bewert|interessenshandlung|testzugang|weitere information|qualifiziert.*antwort)\b/i;

const DIRECT_PAYMENT_VOCAB =
  /\b(kauf|vorbestell|anzahlung|zahlung|preisentscheidung|kaufzusage)\b/i;

const DIRECT_REACH_VOCAB =
  /\b(antwortquote|kontaktquote|qualifizierte reichweite|qualifiziert.*kontakt)\b/i;

type MetricLike = {
  name: string;
  successCriterion: string;
  failureCriterion?: string;
  metricRole?: string;
  signalCategory: SignalCategoryValue;
  proxyStrength?: string | null;
};

export function isEngagementMetric(metric: MetricLike): boolean {
  if (metric.signalCategory === "ATTENTION") return true;
  const blob = `${metric.name} ${metric.successCriterion}`.toLowerCase();
  return ENGAGEMENT_VOCAB.test(blob);
}

export function isIndirectProxyMetric(metric: MetricLike): boolean {
  if (metric.signalCategory === "ATTENTION") return true;
  if (metric.proxyStrength === "PROXY") return true;
  const blob = `${metric.name} ${metric.successCriterion} ${metric.failureCriterion ?? ""}`;
  if (INDIRECT_PROXY_VOCAB.test(blob)) return true;
  if (
    metric.signalCategory === "BEHAVIOR" &&
    /\b(klick|ctr|klickrate)\b/i.test(blob) &&
    !DIRECT_NEED_VOCAB.test(blob) &&
    !DIRECT_REACH_VOCAB.test(blob)
  ) {
    return true;
  }
  return false;
}

export function isDirectDecisiveMetric(
  metric: MetricLike,
  testSubject: TestSubjectValue
): boolean {
  if (metric.metricRole !== "DECISIVE") return false;
  const blob = `${metric.name} ${metric.successCriterion}`;

  if (testSubject === "PROBLEM_RELEVANCE" || testSubject === "VALUE_UNDERSTANDING") {
    if (DIRECT_NEED_VOCAB.test(blob)) return true;
    if (metric.signalCategory === "QUALITATIVE" && !isEngagementMetric(metric))
      return true;
    return (
      metric.signalCategory === "BEHAVIOR" &&
      /\b(testzugang|registrierung.*anford|weitere information|bedarfsabfrage)\b/i.test(
        blob
      )
    );
  }

  if (testSubject === "WILLINGNESS_TO_PAY") {
    return (
      metric.signalCategory === "COMMITMENT" || DIRECT_PAYMENT_VOCAB.test(blob)
    );
  }

  if (testSubject === "REACHABILITY") {
    return (
      metric.signalCategory === "BEHAVIOR" &&
      (DIRECT_REACH_VOCAB.test(blob) || !isIndirectProxyMetric(metric))
    );
  }

  return (
    metric.proxyStrength === "DIRECT" ||
    (!isIndirectProxyMetric(metric) &&
      metric.signalCategory !== "ATTENTION")
  );
}

export function hasDirectDecisiveMetric(
  metrics: MetricLike[],
  testSubject: TestSubjectValue
): boolean {
  return metrics
    .filter((m) => m.metricRole === "DECISIVE")
    .some((m) => isDirectDecisiveMetric(m, testSubject));
}

export function isMetricAllowedByEvidenceContract(
  metric: MetricLike,
  contract: EvidenceContract,
  testSubject: TestSubjectValue
): boolean {
  if (metric.metricRole !== "DECISIVE") return true;

  if (!contract.acceptableDecisiveSignalTypes.includes(metric.signalCategory)) {
    return false;
  }

  if (
    contract.invalidAsSoleEvidence.length > 0 &&
    isIndirectProxyMetric(metric) &&
    !hasDirectDecisiveMetric([metric], testSubject)
  ) {
    const blob = `${metric.name} ${metric.successCriterion}`.toLowerCase();
    const onlyEngagement = contract.invalidAsSoleEvidence.some((inv) =>
      blob.includes(inv.toLowerCase().split(" ")[0] ?? "")
    );
    if (onlyEngagement || isEngagementMetric(metric)) return false;
  }

  return true;
}

/** Re-export for guards compatibility. */
export function isReachProxyDecisiveMetric(metric: MetricLike): boolean {
  if (metric.signalCategory === "ATTENTION") return true;
  const blob = `${metric.name} ${metric.successCriterion}`.toLowerCase();
  return /\b(klick|ctr|klickrate|reichweite|impression|cpc|cpm|reach)\b/.test(
    blob
  );
}
