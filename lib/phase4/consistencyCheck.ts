import type { Phase4StepOutput } from "@/lib/schemas/phase4";
import {
  hasOwnedSocialReach,
  isSocialMediaAllowed,
} from "./constraints";
import {
  hasDirectDecisiveMetric,
  isIndirectProxyMetric,
  isMetricAllowedByEvidenceContract,
} from "./metricHelpers";
import type {
  AssumptionPlanning,
  NormalizedPhase4Constraints,
  Phase4ConsistencyIssue,
} from "./validationCoreTypes";
import { claimTypeToTestSubject } from "./validationCoreTypes";
import { detectCompoundClaims } from "./validationCore";

const INTERNAL_PROCESS_LANGUAGE =
  /\b(dieselbe annahme|zuvor naheliegende methode|wurde ersetzt|fallback|ursprünglich(er)? vorschlag|die ki hat|das modell hat|wegen des prompts|durch deine angabe ersetzt)\b/i;

const SOCIAL_VOCAB =
  /\b(social|linkedin|instagram|facebook|tiktok|social.?media)\b/i;
const EXTERNAL_DISTRIBUTION_VOCAB =
  /\b(community|communities|gruppe|gruppen|direktansprache|direkt(e|er|en)?\s+ansprache|multiplikator|influencer|mikro-influencer|micro-influencer|creator|kooperation|newsletter|bezahlt(e|en)?\s+(ausspielung|anzeigen|werbung)|ads|anzeigen?|werbeanzeigen?|gesponsert|paid|partner)\b/i;
const EXCLUDED_SOCIAL_CLAIM =
  /\b(social.?media.*ausgeschlossen|posts?.*ausgeschlossen|linkedin.*ausgeschlossen)\b/i;

const ACTIVITY_PREPARE =
  /\b(formulier|erstell|vorbereit|stimulus|hypothese|leitfaden|entwurf)\b/i;
const ACTIVITY_ACCESS =
  /\b(community|gruppe|zugang|kanal|reichweite|auswählen|identifizier)\b/i;
const ACTIVITY_RECRUIT =
  /\b(verteil|ansprach|einlad|erreichen|rekrutier|teilen|posten|veröffentlich)\b/i;
const ACTIVITY_COLLECT =
  /\b(erfass|auswert|abfrage|messen|beobacht|antwort|feedback|umfrage)\b/i;
const ACTIVITY_DOCUMENT =
  /\b(dokumentier|festhalt|protokoll|notier|auswert)\b/i;

type StepInput = Phase4StepOutput & { methodWarning?: string | null };

function stepText(step: StepInput): string {
  return [
    step.title,
    step.description,
    step.testDesign,
    step.validationQuestion,
    step.channel ?? "",
    ...(step.marketingActivities ?? []),
    step.methodWarning ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function mentionsSocialInStep(step: StepInput): boolean {
  const text = stepText(step);
  if (/keine\s+eigene\s+social-media-reichweite/i.test(text)) {
    const withoutNegation = text.replace(
      /keine\s+eigene\s+social-media-reichweite/gi,
      ""
    );
    return SOCIAL_VOCAB.test(withoutNegation);
  }
  return SOCIAL_VOCAB.test(text);
}

export function hasExternalDistributionPath(step: StepInput): boolean {
  return EXTERNAL_DISTRIBUTION_VOCAB.test(stepText(step));
}

function mentionsExcludedMethod(
  step: StepInput,
  constraints: NormalizedPhase4Constraints
): string | null {
  const text = stepText(step);
  if (constraints.interviews === "EXCLUDED" && /\binterview/i.test(text))
    return "interviews";
  if (constraints.socialMediaPosting === "EXCLUDED" && SOCIAL_VOCAB.test(text))
    return "social";
  if (constraints.paidAds === "EXCLUDED" && /\b(anzeige|ads|werbung)\b/i.test(text))
    return "anzeigen";
  return null;
}

function activityCoversPurpose(
  activities: string[],
  pattern: RegExp
): boolean {
  return activities.some((a) => pattern.test(a.toLowerCase()));
}

export function checkValidationStepConsistency(
  step: StepInput,
  planning: AssumptionPlanning,
  constraints: NormalizedPhase4Constraints
): Phase4ConsistencyIssue[] {
  const issues: Phase4ConsistencyIssue[] = [];
  const { validationCore: core, evidenceContract: contract } = planning;
  const expectedSubject = planning.primaryTestSubject;

  if (step.testSubject !== expectedSubject) {
    const expectedFromCore = claimTypeToTestSubject(core.claimType);
    if (
      step.testSubject === "REACHABILITY" &&
      (core.claimType === "NEED" || core.claimType === "PROBLEM_RELEVANCE")
    ) {
      issues.push({
        code: "PHASE4_TEST_SUBJECT_MISMATCH",
        severity: "ERROR",
        message:
          "testSubject REACHABILITY passt nicht zum Aussagekern Bedarf/Problemrelevanz.",
        repairInstruction:
          `Setze testSubject auf ${expectedFromCore} und wähle eine direkte Bedarfsmetrik.`,
      });
    } else if (
      step.testSubject === "REACHABILITY" &&
      core.claimType === "WILLINGNESS_TO_PAY"
    ) {
      issues.push({
        code: "PHASE4_TEST_SUBJECT_MISMATCH",
        severity: "ERROR",
        message: "Zahlungsbereitschaft darf nicht als Erreichbarkeit getestet werden.",
        repairInstruction: "Setze testSubject auf WILLINGNESS_TO_PAY mit COMMITMENT-Metrik.",
      });
    }
  }

  const decisive = step.metrics.filter((m) => m.metricRole === "DECISIVE");
  if (decisive.length === 0) {
    issues.push({
      code: "PHASE4_MISSING_PRIMARY_METRIC",
      severity: "ERROR",
      message: "Es fehlt eine primäre Entscheidungsmetrik.",
    });
  } else if (decisive.length > 1) {
    issues.push({
      code: "PHASE4_MULTIPLE_PRIMARY_METRICS",
      severity: "WARNING",
      message: "Mehrere entscheidende Metriken — genau eine sollte klar dominant sein.",
    });
  }

  for (const metric of decisive) {
    if (!isMetricAllowedByEvidenceContract(metric, contract, step.testSubject)) {
      issues.push({
        code: "PHASE4_PRIMARY_METRIC_MISMATCH",
        severity: "ERROR",
        message: `Metrik '${metric.name}' passt nicht zum EvidenceContract.`,
        repairInstruction:
          "Wähle eine direkte Metrik gemäß requiredEvidence im EvidenceContract.",
      });
    }

    if (
      (core.claimType === "NEED" ||
        core.claimType === "PROBLEM_RELEVANCE" ||
        core.claimType === "VALUE_PERCEPTION" ||
        core.claimType === "WILLINGNESS_TO_PAY") &&
      isIndirectProxyMetric(metric) &&
      !hasDirectDecisiveMetric(decisive, step.testSubject)
    ) {
      issues.push({
        code: "PHASE4_ONLY_INDIRECT_DECISIVE_SIGNAL",
        severity: "ERROR",
        message:
          "Nur indirekte Proxy-Signale als entscheidende Metrik — unzulässig für diesen Aussagekern.",
        repairInstruction:
          "Ergänze eine direkte qualifizierte Problembestätigung, Interessenshandlung oder Kaufentscheidung.",
      });
    }
  }

  const vq = step.validationQuestion.toLowerCase();
  if (
    (core.claimType === "NEED" || core.claimType === "PROBLEM_RELEVANCE") &&
    /\b(erreichbar|reichweite|kanal|linkedin)\b/i.test(vq) &&
    !/\b(problem|bedarf|interesse)\b/i.test(vq)
  ) {
    issues.push({
      code: "PHASE4_VALIDATION_QUESTION_MISMATCH",
      severity: "ERROR",
      message: "Die Prüffrage testet Erreichbarkeit statt des Aussagekerns.",
      repairInstruction: `Formuliere die Prüffrage zur Unsicherheit: ${core.claim}`,
    });
  }

  const excluded = mentionsExcludedMethod(step, constraints);
  if (excluded) {
    issues.push({
      code: "PHASE4_EXCLUDED_METHOD_USED",
      severity: "ERROR",
      message: `Ausgeschlossene Methode '${excluded}' wird im Testdesign verwendet.`,
      repairInstruction: `Entferne ${excluded} und nutze eine zulässige Alternative.`,
    });
  }

  if (
    isSocialMediaAllowed(constraints) &&
    !hasOwnedSocialReach(constraints) &&
    mentionsSocialInStep(step) &&
    !hasExternalDistributionPath(step)
  ) {
    issues.push({
      code: "PHASE4_SOCIAL_WITHOUT_DISTRIBUTION_PATH",
      severity: "ERROR",
      message:
        "Social Media ohne eigene Reichweite — externer Verbreitungsweg fehlt.",
      repairInstruction:
        "Nenne einen konkreten externen Verbreitungsweg (Community, Direktansprache, Partner/Multiplikator/Influencer/Kooperation/Creator, bezahlte Ausspielung/Ads/Anzeigen).",
    });
  }

  if (
    isSocialMediaAllowed(constraints) &&
    EXCLUDED_SOCIAL_CLAIM.test(stepText(step))
  ) {
    issues.push({
      code: "PHASE4_FALSE_EXCLUSION_CLAIM",
      severity: "ERROR",
      message: "Social Media wurde nicht ausgeschlossen, wird aber als ausgeschlossen behandelt.",
      repairInstruction: "Entferne falsche Ausschlussbehauptungen zu Social Media.",
    });
  }

  const activities = step.marketingActivities ?? [];
  const hasPrepare = activityCoversPurpose(activities, ACTIVITY_PREPARE);
  const hasAccess = activityCoversPurpose(activities, ACTIVITY_ACCESS);
  const hasRecruit = activityCoversPurpose(activities, ACTIVITY_RECRUIT);
  const hasCollect = activityCoversPurpose(activities, ACTIVITY_COLLECT);
  const hasDocument = activityCoversPurpose(activities, ACTIVITY_DOCUMENT);

  if (!hasPrepare || !hasCollect || !hasDocument) {
    issues.push({
      code: "PHASE4_ACTIVITY_CHAIN_INCOMPLETE",
      severity: "WARNING",
      message:
        "Aktivitäten decken nicht alle Testfunktionen ab (Vorbereitung, Signalerhebung, Dokumentation).",
    });
  }

  if (!hasAccess && !hasRecruit && constraints.targetGroupAccess !== "vorhanden") {
    issues.push({
      code: "PHASE4_UNAVAILABLE_ACCESS_PATH",
      severity: "WARNING",
      message: "Kein erkennbarer Zielgruppenzugang in den Aktivitäten.",
    });
  }

  const genericMarketing =
    /\b(reichweite erhöhen|marke bekannter|brand awareness|content veröffentlichen)\b/i;
  if (
    activities.some((a) => genericMarketing.test(a)) &&
    !/\b(test|abfrage|hypothese|validier)/i.test(activities.join(" "))
  ) {
    issues.push({
      code: "PHASE4_UNRELATED_MARKETING_ACTIVITY",
      severity: "WARNING",
      message: "Allgemeine Marketingaktivität ohne Testfunktion.",
    });
  }

  if (INTERNAL_PROCESS_LANGUAGE.test(stepText(step))) {
    issues.push({
      code: "PHASE4_INTERNAL_PROCESS_LANGUAGE",
      severity: "ERROR",
      message: "Interne Prozesssprache im sichtbaren Entwurf.",
      repairInstruction: "Formuliere nutzerverständlich ohne Generierungsbezug.",
    });
  }

  if (step.methodWarning) {
    if (
      hasExternalDistributionPath(step) &&
      /alternativ(er)? kanal nötig|social.?media.?reichweite nicht als vorhanden/i.test(
        step.methodWarning
      )
    ) {
      issues.push({
        code: "PHASE4_WARNING_DESIGN_CONTRADICTION",
        severity: "WARNING",
        message: "methodWarning widerspricht dem Testdesign (Verbreitungsweg vorhanden).",
      });
    }
    if (
      isSocialMediaAllowed(constraints) &&
      /social.?media.*ausgeschlossen/i.test(step.methodWarning)
    ) {
      issues.push({
        code: "PHASE4_WARNING_DESIGN_CONTRADICTION",
        severity: "ERROR",
        message: "methodWarning behauptet fälschlich einen Social-Media-Ausschluss.",
      });
    }
  }

  for (const metric of decisive) {
    const blob = `${metric.name} ${metric.successCriterion} ${metric.failureCriterion}`;
    if (
      /\b(signifikant|prozent)\b/i.test(blob) &&
      /\banzahl\b/i.test(metric.name) &&
      !/\b(von|anteil|%\s*der)\b/i.test(blob)
    ) {
      issues.push({
        code: "PHASE4_UNCLEAR_METRIC_DENOMINATOR",
        severity: "WARNING",
        message: `Metrik '${metric.name}' mischt absolute und relative Logik.`,
      });
    }

    if (
      /\bzu klein|weniger als \d+ (teilnahmen|antworten|personen)\b/i.test(
        metric.failureCriterion
      ) &&
      !/\buneindeutig|inconclusive|nicht ausreichend\b/i.test(
        `${metric.successCriterion} ${metric.failureCriterion}`
      )
    ) {
      issues.push({
        code: "PHASE4_INCONCLUSIVE_ZONE_MISSING",
        severity: "WARNING",
        message: "Kleine Stichprobe sollte uneindeutigen Bereich erlauben, nicht automatisch widerlegen.",
      });
    }
  }

  void expectedSubject;
  return issues;
}

export function consistencyIssuesToViolations(
  issues: Phase4ConsistencyIssue[],
  stepIndex: number
): { rule: "C1"; message: string; severity: "ERROR" | "WARNING" }[] {
  return issues.map((issue) => ({
    rule: "C1" as const,
    message: `[${issue.code}] Schritt ${stepIndex + 1}: ${issue.message}`,
    severity: issue.severity,
  }));
}

export function checkAssumptionPlanning(input: {
  id: string;
  content: string;
  justification: string | null;
  uncertainty: string | null;
  strategyDimension: import("@prisma/client").StrategyDimension | null;
  category: string;
}): Phase4ConsistencyIssue | null {
  return detectCompoundClaims(input);
}
