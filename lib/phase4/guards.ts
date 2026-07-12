import type {
  EvidenceStatus,
  StrategyDimension,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isActiveAdopted } from "@/lib/statementFilters";
import { PHASE4_REPAIR_PROMPT } from "@/lib/prompts/phase4Repair";
import type { SignalCategoryValue, TestSubjectValue } from "@/lib/schemas/metric";
import {
  phase4LlmResponseSchema,
  type Phase4LlmResponse,
  type Phase4StepOutput,
} from "@/lib/schemas/phase4";
import type { Phase4Mode } from "@/lib/phase4/types";
import { statementCategoryToStrategyDimension } from "./strategyDimension";
import {
  formatConsistencyRepairHints,
  applyPlanningToSteps,
  collectConsistencyIssuesForResult,
  type Phase4PlanningBundle,
} from "./pipeline";
import {
  isDirectDecisiveMetric,
  isReachProxyDecisiveMetric,
} from "./metricHelpers";
import { deriveAllowedDecisiveTestSubjects } from "./testSubjectDerivation";
import {
  buildForeignPlatformMethodWarning,
  findForeignPlatformsInChannel,
  findForeignPlatformsInStepContent,
  type PlatformKey,
} from "./availableChannels";

export type WhitelistCandidate = {
  id: string;
  content: string;
  justification: string | null;
  uncertainty: string | null;
  evidenceStatus: EvidenceStatus;
  strategyDimension: StrategyDimension | null;
  category: string;
  allowedDecisiveTestSubjects: TestSubjectValue[];
};

export type WhitelistDimensionState = "UNDETERMINABLE" | "SINGLE" | "MULTI";

export type GuardContext = {
  mode: Phase4Mode;
  whitelist: WhitelistCandidate[];
  validatedChannels: string[];
  whitelistDimensionState: WhitelistDimensionState;
  availablePlatformKeys?: readonly PlatformKey[];
  availableChannelLabels?: readonly string[];
  availableSalesChannels?: readonly string[];
};

export type StepViolation = {
  stepIndex: number;
  rule:
    | "V1"
    | "V2"
    | "V3"
    | "V3b"
    | "V4"
    | "V5"
    | "V6"
    | "V7"
    | "V7s"
    | "V8"
    | "V9"
    | "C1";
  message: string;
};

export type ProcessedStep = Phase4StepOutput & {
  methodWarning: string | null;
};

export type GuardProcessResult = {
  steps: ProcessedStep[];
  diversityNote: string | null;
  modeNote: string | null;
  repairTriggered: boolean;
  repairSucceeded: boolean;
  log: string[];
};

/** Allowed decisive signal categories per test subject (V4/V5 matrix). */
export const ALLOWED_DECISIVE_SIGNAL: Record<
  TestSubjectValue,
  readonly SignalCategoryValue[]
> = {
  WILLINGNESS_TO_PAY: ["COMMITMENT"],
  REACHABILITY: ["BEHAVIOR"],
  PROBLEM_RELEVANCE: ["QUALITATIVE", "BEHAVIOR"],
  VALUE_UNDERSTANDING: ["BEHAVIOR", "QUALITATIVE"],
  DIFFERENTIATION: ["BEHAVIOR", "QUALITATIVE"],
  REVENUE_MECHANICS: ["COMMITMENT", "BEHAVIOR"],
  OTHER: ["COMMITMENT", "BEHAVIOR", "QUALITATIVE"],
};

function attachAllowedTestSubjects(
  statement: Pick<
    WhitelistCandidate,
    "content" | "justification" | "uncertainty"
  >
): TestSubjectValue[] {
  return deriveAllowedDecisiveTestSubjects({
    content: statement.content,
    justification: statement.justification,
    uncertainty: statement.uncertainty,
  });
}

export async function buildCandidateWhitelist(
  projectId: string,
  mode: Phase4Mode
): Promise<WhitelistCandidate[]> {
  const option = await prisma.strategyOption.findFirst({
    where: { projectId, status: "PRIORITIZED" },
    include: {
      statements: {
        include: {
          statement: {
            select: {
              id: true,
              content: true,
              justification: true,
              uncertainty: true,
              evidenceStatus: true,
              adopted: true,
              supersededByStatementId: true,
              category: true,
            },
          },
        },
      },
    },
  });

  if (!option) return [];

  if (mode === "VALIDATION") {
    return option.statements
      .map((link) => link.statement)
      .filter(
        (statement) =>
          isActiveAdopted(statement) &&
          (statement.evidenceStatus === "ASSUMPTION" ||
            statement.evidenceStatus === "OPEN_QUESTION")
      )
      .map((statement) => ({
        id: statement.id,
        content: statement.content,
        justification: statement.justification,
        uncertainty: statement.uncertainty,
        evidenceStatus: statement.evidenceStatus,
        strategyDimension: statementCategoryToStrategyDimension(
          statement.category
        ),
        category: statement.category,
        allowedDecisiveTestSubjects: attachAllowedTestSubjects(statement),
      }));
  }

  // SCALING (Z1): adopted FACT + SUPPORTED feedback via adopted implemented step.
  const adoptedSteps = await prisma.validationStep.findMany({
    where: { optionId: option.id, adopted: true, discardedAt: null },
    select: { id: true },
  });
  const adoptedStepIds = adoptedSteps.map((step) => step.id);

  if (adoptedStepIds.length === 0) return [];

  const supportedFeedbacks = await prisma.marketFeedback.findMany({
    where: {
      stepId: { in: adoptedStepIds },
      result: "SUPPORTED",
      interpretation: { not: null },
    },
    select: { statementId: true, stepId: true },
  });

  const scalingIds = new Set(
    supportedFeedbacks.map((feedback) => feedback.statementId)
  );

  const candidates = option.statements
    .map((link) => link.statement)
    .filter(
      (statement) =>
        isActiveAdopted(statement) &&
        statement.evidenceStatus === "FACT" &&
        scalingIds.has(statement.id)
    );

  return candidates.map((statement) => ({
    id: statement.id,
    content: statement.content,
    justification: statement.justification,
    uncertainty: statement.uncertainty,
    evidenceStatus: statement.evidenceStatus,
    strategyDimension: statementCategoryToStrategyDimension(statement.category),
    category: statement.category,
    allowedDecisiveTestSubjects: attachAllowedTestSubjects(statement),
  }));
}

/** Distinct channels from adopted, assessed steps of the prior run (Z3). */
export async function getValidatedChannels(projectId: string): Promise<string[]> {
  const option = await prisma.strategyOption.findFirst({
    where: { projectId, status: "PRIORITIZED" },
    select: { id: true },
  });
  if (!option) return [];

  const adoptedSteps = await prisma.validationStep.findMany({
    where: { optionId: option.id, adopted: true, discardedAt: null },
    select: { id: true, channel: true },
  });
  if (adoptedSteps.length === 0) return [];

  const assessedStepIds = new Set(
    (
      await prisma.marketFeedback.findMany({
        where: {
          stepId: { in: adoptedSteps.map((step) => step.id) },
          interpretation: { not: null },
        },
        select: { stepId: true },
      })
    )
      .map((feedback) => feedback.stepId)
      .filter((id): id is string => id != null)
  );

  const channels = new Set<string>();
  for (const step of adoptedSteps) {
    if (!assessedStepIds.has(step.id)) continue;
    const channel = step.channel?.trim();
    if (channel) channels.add(channel);
  }
  return [...channels];
}

export function deriveStepStrategyDimension(
  assumptionId: string,
  ctx: GuardContext
): StrategyDimension | null {
  const candidate = ctx.whitelist.find((entry) => entry.id === assumptionId);
  return candidate?.strategyDimension ?? null;
}

export function getAllowedDecisiveTestSubjects(
  assumptionId: string,
  ctx: GuardContext
): TestSubjectValue[] {
  const candidate = ctx.whitelist.find((entry) => entry.id === assumptionId);
  return candidate?.allowedDecisiveTestSubjects ?? [];
}

/** V8: DECISIVE metrics must carry proxyStrength + signalRationale (repairOnce, not Zod 502). */
export function validateMetricEffectLogic(
  result: Phase4LlmResponse
): StepViolation[] {
  const violations: StepViolation[] = [];

  result.steps.forEach((step, stepIndex) => {
    const stepNum = stepIndex + 1;
    for (const metric of step.metrics) {
      if (metric.metricRole !== "DECISIVE") continue;

      if (!metric.proxyStrength) {
        violations.push({
          stepIndex,
          rule: "V8",
          message: `Schritt ${stepNum} verletzt V8: entscheidende Metrik '${metric.name}' fehlt proxyStrength (DIRECT | PROXY).`,
        });
      }
      if (!metric.signalRationale?.trim()) {
        violations.push({
          stepIndex,
          rule: "V8",
          message: `Schritt ${stepNum} verletzt V8: entscheidende Metrik '${metric.name}' fehlt signalRationale mit Bezug zur Unsicherheit der Annahme.`,
        });
      }
    }
  });

  return violations;
}

function collectConsistencyViolations(
  result: Phase4LlmResponse,
  planningBundle: Phase4PlanningBundle | undefined
): StepViolation[] {
  if (!planningBundle) return [];

  const collected = collectConsistencyIssuesForResult(
    result.steps,
    planningBundle
  );
  const violations: StepViolation[] = [];

  for (const entry of collected) {
    for (const issue of entry.issues) {
      if (issue.severity !== "ERROR") continue;
      violations.push({
        stepIndex: entry.stepIndex,
        rule: "C1",
        message: `[${issue.code}] Schritt ${entry.stepIndex + 1}: ${issue.message}`,
      });
    }
  }

  return violations;
}

function collectStepViolations(
  result: Phase4LlmResponse,
  ctx: GuardContext,
  planningBundle?: Phase4PlanningBundle
): StepViolation[] {
  return [
    ...validateSteps(result, ctx),
    ...validateMetricEffectLogic(result),
    ...collectConsistencyViolations(result, planningBundle),
  ];
}

/** Silently downgrades LLM-assigned DIRECT when isDirectDecisiveMetric disagrees. */
export function applyProxyStrengthCorrections(
  result: Phase4LlmResponse
): Phase4LlmResponse {
  return {
    ...result,
    steps: result.steps.map((step, stepIndex) => ({
      ...step,
      metrics: step.metrics.map((metric) => {
        if (
          metric.metricRole !== "DECISIVE" ||
          metric.proxyStrength !== "DIRECT"
        ) {
          return metric;
        }

        if (isDirectDecisiveMetric(metric, step.testSubject)) {
          return metric;
        }

        console.log(
          `[phase4/guards] proxyStrength DIRECT→PROXY: Schritt ${stepIndex + 1}, Metrik '${metric.name}' (testSubject=${step.testSubject}) — isDirectDecisiveMetric=false`
        );
        return { ...metric, proxyStrength: "PROXY" as const };
      }),
    })),
  };
}

function applyDerivedStrategyDimensions(
  result: Phase4LlmResponse,
  ctx: GuardContext
): Phase4LlmResponse {
  return {
    ...result,
    steps: result.steps.map((step, index) => {
      const derived = deriveStepStrategyDimension(step.assumptionId, ctx);
      if (step.strategyDimension !== derived) {
        console.warn(
          `[phase4/guards] strategyDimension-Mismatch: LLM=${step.strategyDimension}, abgeleitet=${derived}, Schritt=${index + 1}`
        );
      }
      return {
        ...step,
        strategyDimension: derived ?? step.strategyDimension,
      };
    }),
  };
}

export function computeWhitelistDimensionState(
  whitelist: WhitelistCandidate[]
): WhitelistDimensionState {
  const nullCandidates = whitelist.filter(
    (candidate) => candidate.strategyDimension == null
  );
  if (nullCandidates.length > 0) {
    console.warn(
      "[phase4/guards] Whitelist-Kandidaten ohne mappbare strategyDimension:",
      nullCandidates.map((candidate) => ({
        id: candidate.id,
        category: candidate.category,
      }))
    );
  }

  const dimensions = new Set(
    whitelist
      .map((candidate) => candidate.strategyDimension)
      .filter((dimension): dimension is StrategyDimension => dimension != null)
  );

  if (dimensions.size === 0) {
    console.warn(
      "[phase4/guards] V3 unbestimmbar: kein Whitelist-Kandidat hat eine mappbare strategyDimension — Diversitätsregel wird nicht geprüft."
    );
    return "UNDETERMINABLE";
  }

  if (dimensions.size === 1) {
    console.log(
      "[phase4/guards] V3 Ausnahme (SINGLE): Whitelist enthält nur eine strategyDimension:",
      [...dimensions][0]
    );
    return "SINGLE";
  }

  return "MULTI";
}

export function validateSteps(
  result: Phase4LlmResponse,
  ctx: GuardContext
): StepViolation[] {
  const violations: StepViolation[] = [];
  const whitelistIds = new Set(ctx.whitelist.map((candidate) => candidate.id));
  const seenAssumptionIds = new Set<string>();

  result.steps.forEach((step, index) => {
    const stepNum = index + 1;

    if (!whitelistIds.has(step.assumptionId)) {
      violations.push({
        stepIndex: index,
        rule: "V1",
        message: `Schritt ${stepNum} verletzt V1: assumptionId '${step.assumptionId}' liegt nicht in der Whitelist. Erlaubte IDs: [${[...whitelistIds].join(", ")}].`,
      });
    }

    if (seenAssumptionIds.has(step.assumptionId)) {
      violations.push({
        stepIndex: index,
        rule: "V2",
        message: `Schritt ${stepNum} verletzt V2: assumptionId '${step.assumptionId}' ist bereits einem anderen Schritt zugeordnet. Jede Annahme darf nur einmal vorkommen.`,
      });
    }
    seenAssumptionIds.add(step.assumptionId);

    if (
      ctx.mode === "VALIDATION" &&
      result.steps.length >= 2 &&
      ctx.whitelistDimensionState === "MULTI"
    ) {
      const dimensions = new Set(
        result.steps
          .map((entry) => deriveStepStrategyDimension(entry.assumptionId, ctx))
          .filter((dimension): dimension is StrategyDimension => dimension != null)
      );
      if (dimensions.size < 2 && index === 0) {
        violations.push({
          stepIndex: index,
          rule: "V3",
          message: `Verletzung V3: Bei ${result.steps.length} Schritten müssen mindestens zwei verschiedene strategyDimension-Werte vertreten sein (aktuell: ${[...dimensions].join(", ")}). Die Whitelist enthält mehrere Dimensionen.`,
        });
      }
    }

    if (ctx.mode === "SCALING") {
      const candidate = ctx.whitelist.find(
        (entry) => entry.id === step.assumptionId
      );
      if (!candidate) {
        violations.push({
          stepIndex: index,
          rule: "V3b",
          message: `Schritt ${stepNum} verletzt V3b: assumptionId '${step.assumptionId}' erfüllt nicht alle Skalierungsbedingungen (adopted FACT mit SUPPORTED-Feedback über umgesetzten Schritt).`,
        });
      }
    }

    const decisive = step.metrics.filter(
      (metric) => metric.metricRole === "DECISIVE"
    );
    for (const metric of decisive) {
      if (metric.signalCategory === "ATTENTION") {
        violations.push({
          stepIndex: index,
          rule: "V5",
          message: `Schritt ${stepNum} verletzt V5: entscheidender Messpunkt '${metric.name}' hat signalCategory ATTENTION. ATTENTION ist niemals als entscheidendes Signal zulässig.`,
        });
      }

      const allowed = ALLOWED_DECISIVE_SIGNAL[step.testSubject];
      if (!allowed.includes(metric.signalCategory)) {
        violations.push({
          stepIndex: index,
          rule: "V4",
          message: `Schritt ${stepNum} verletzt V4: entscheidender Messpunkt '${metric.name}' hat signalCategory ${metric.signalCategory}. Bei testSubject ${step.testSubject} sind nur ${allowed.join(" oder ")} als entscheidend zulässig.`,
        });
      }
    }

    const allowedTestSubjects = getAllowedDecisiveTestSubjects(
      step.assumptionId,
      ctx
    );
    if (
      allowedTestSubjects.length > 0 &&
      !allowedTestSubjects.includes(step.testSubject)
    ) {
      const allowedLabel = allowedTestSubjects.join(", ");
      const decisiveAlignsWithAllowed = decisive.every((metric) =>
        allowedTestSubjects.some((subject) =>
          ALLOWED_DECISIVE_SIGNAL[subject].includes(metric.signalCategory)
        )
      );
      const reachProxyDecisive = decisive.some((metric) =>
        isReachProxyDecisiveMetric(metric)
      );
      const reachabilityVeto =
        step.testSubject === "REACHABILITY" &&
        !allowedTestSubjects.includes("REACHABILITY") &&
        reachProxyDecisive;

      if (decisive.length === 0) {
        violations.push({
          stepIndex: index,
          rule: "V7s",
          message: `Schritt ${stepNum} Hinweis V7s: testSubject '${step.testSubject}' liegt außerhalb des erlaubten Satzes [${allowedLabel}], betrifft aber nur unterstützende Metriken.`,
        });
      } else if (
        reachabilityVeto ||
        !decisiveAlignsWithAllowed
      ) {
        violations.push({
          stepIndex: index,
          rule: "V7",
          message: `Schritt ${stepNum} verletzt V7: testSubject '${step.testSubject}' passt nicht zur Unsicherheit der Annahme (erlaubter DECISIVE-Satz: [${allowedLabel}]). Entscheidende Metriken spiegeln Erreichbarkeit oder ein nicht passendes Signal.`,
        });
      } else {
        violations.push({
          stepIndex: index,
          rule: "V7s",
          message: `Schritt ${stepNum} Hinweis V7s: testSubject '${step.testSubject}' liegt außerhalb von [${allowedLabel}], die entscheidenden Metriken passen jedoch zur Annahme.`,
        });
      }
    }

    if (ctx.mode === "SCALING" && step.channel) {
      const channel = step.channel.trim();
      const normalized = ctx.validatedChannels.map((entry) =>
        entry.trim().toLowerCase()
      );
      if (
        channel &&
        !normalized.includes(channel.toLowerCase()) &&
        ctx.validatedChannels.length > 0
      ) {
        violations.push({
          stepIndex: index,
          rule: "V6",
          message: `Schritt ${stepNum} verletzt V6: Kanal '${channel}' ist nicht validiert. Validierte Kanäle: [${ctx.validatedChannels.join(", ")}]. Formuliere den Schritt mit einem validierten Kanal oder entferne ihn.`,
        });
      }
    }

    const allowedPlatforms = ctx.availablePlatformKeys ?? [];
    if (allowedPlatforms.length > 0 && step.channel?.trim()) {
      const foreignPlatforms = findForeignPlatformsInChannel(
        step.channel,
        allowedPlatforms
      );
      if (foreignPlatforms.length > 0) {
        violations.push({
          stepIndex: index,
          rule: "V9",
          message: `Schritt ${stepNum} verletzt V9: Kanal '${step.channel}' nennt Plattform(en) [${foreignPlatforms.join(", ")}], die nicht in verfuegbareKanaele enthalten sind. Ersetze den betroffenen Schritt vollständig (validationQuestion, testDesign, title, description, marketingActivities, channel, metrics) mit einem Kanal aus Profil, Fragebogen oder Strategieoption — keine stille Feldkorrektur.`,
        });
      }
    }
  });

  return violations;
}

function logV9RepairOutcome(
  result: Phase4LlmResponse,
  ctx: GuardContext,
  beforeRepair: Map<number, string[]>,
  remainingV9: StepViolation[]
): void {
  const allowed = ctx.availablePlatformKeys ?? [];
  if (allowed.length === 0 || beforeRepair.size === 0) return;

  const remainingIndices = new Set(
    remainingV9.filter((v) => v.rule === "V9").map((v) => v.stepIndex)
  );

  for (const [stepIndex, foreignBefore] of beforeRepair) {
    const step = result.steps[stepIndex];
    if (!step) continue;

    const foreignInChannel = findForeignPlatformsInChannel(step.channel, allowed);
    const foreignInContent = findForeignPlatformsInStepContent(step, allowed);

    if (foreignInChannel.length === 0) {
      console.log(
        `[phase4/guards] V9 Repair erfolgreich: Schritt ${stepIndex + 1} — fremde Plattform(en) [${foreignBefore.join(", ")}] im channel entfernt; neuer channel='${step.channel ?? ""}'`
      );
      if (foreignInContent.length > 0) {
        console.log(
          `[phase4/guards] V9 Repair-Inkonsistenz: Schritt ${stepIndex + 1} — Plattform(en) [${foreignInContent.join(", ")}] noch in Testdesign/Aktivitäten/Text`
        );
      } else {
        console.log(
          `[phase4/guards] V9 Repair konsistent: Schritt ${stepIndex + 1} — keine fremde Plattform mehr im Schrittinhalt`
        );
      }
      continue;
    }

    if (remainingIndices.has(stepIndex)) {
      console.log(
        `[phase4/guards] V9 Fail-open: Schritt ${stepIndex + 1} — nach Repair weiterhin [${foreignInChannel.join(", ")}] im channel → Soft-Warnung, Schritt bleibt übernehmbar`
      );
    }
  }
}

function stripV9Violations(violations: StepViolation[]): StepViolation[] {
  return violations.filter((violation) => violation.rule !== "V9");
}

function methodWarningForViolation(violation: StepViolation): string | null {
  if (violation.rule === "V4" || violation.rule === "V5") {
    return "Hinweis: Das entscheidende Signal dieses Schritts misst Aufmerksamkeit oder passt nicht zur geprüften Aussage und kann sie nicht belegen. Bitte vor Übernahme anpassen.";
  }
  if (violation.rule === "V7s") {
    return "Hinweis: Der gewählte testSubject passt nicht zur Unsicherheit der Annahme. Da nur unterstützende Metriken betroffen sind, kannst du den Schritt übernehmen — prüfe die Zuordnung dennoch.";
  }
  if (violation.rule === "V6") {
    const channelMatch = violation.message.match(/Kanal '([^']+)'/);
    const channel = channelMatch?.[1] ?? "dieser Kanal";
    return `Dieser Schritt führt mit „${channel}“ einen bisher ungeprüften Kanal ein. Im Fortführungsmodus ist das nicht vorgesehen, da damit eine neue, ungeprüfte Erreichbarkeitsannahme entsteht. Wenn du diesen Kanal testen möchtest, wähle in Phase 5 „Anpassen (ADAPT)“ statt „Fortführen (CONTINUE)“.`;
  }
  return null;
}

function applyPostValidation(
  result: Phase4LlmResponse,
  violations: StepViolation[]
): ProcessedStep[] {
  const structuralRules = new Set(["V1", "V2", "V3", "V3b", "V7", "V8", "C1"]);
  const warnableRules = new Set(["V4", "V5", "V6", "V7s"]);

  if (violations.some((violation) => violation.rule === "V3")) {
    console.log(
      "[phase4/guards] Alle Schritte verworfen (V3 Diversität nach Repair):",
      violations.find((violation) => violation.rule === "V3")?.message
    );
    return [];
  }

  const violationsByStep = new Map<number, StepViolation[]>();
  for (const violation of violations) {
    const list = violationsByStep.get(violation.stepIndex) ?? [];
    list.push(violation);
    violationsByStep.set(violation.stepIndex, list);
  }

  const processed: ProcessedStep[] = [];

  result.steps.forEach((step, index) => {
    const stepViolations = violationsByStep.get(index) ?? [];
    const hasStructural = stepViolations.some((violation) =>
      structuralRules.has(violation.rule)
    );

    if (hasStructural) {
      console.log(
        `[phase4/guards] Schritt ${index + 1} verworfen (struktureller Verstoß):`,
        stepViolations.map((violation) => violation.message).join(" | ")
      );
      return;
    }

    const warnViolations = stepViolations.filter((violation) =>
      warnableRules.has(violation.rule)
    );
    const methodWarning =
      warnViolations.length > 0
        ? methodWarningForViolation(warnViolations[0]!)
        : null;

    if (methodWarning) {
      console.log(
        `[phase4/guards] Schritt ${index + 1} methodWarning gesetzt:`,
        warnViolations.map((violation) => violation.message).join(" | ")
      );
    }

    processed.push({ ...step, methodWarning });
  });

  return processed;
}

function applyChannelPlatformWarnings(
  steps: ProcessedStep[],
  ctx: GuardContext
): ProcessedStep[] {
  const allowed = ctx.availablePlatformKeys ?? [];
  if (allowed.length === 0) return steps;

  const allowedSet = new Set(allowed);

  return steps.map((step, index) => {
    const foreignPlatforms = findForeignPlatformsInChannel(
      step.channel,
      allowedSet
    );
    if (foreignPlatforms.length === 0) return step;

    const warning = buildForeignPlatformMethodWarning(foreignPlatforms);
    console.log(
      `[phase4/guards] Kanal-Soft-Warnung Schritt ${index + 1}: ${foreignPlatforms.join(", ")} nicht in verfuegbareKanaele`
    );

    return {
      ...step,
      methodWarning: step.methodWarning
        ? `${step.methodWarning} ${warning}`
        : warning,
    };
  });
}

function c1ViolationStepIndices(violations: StepViolation[]): Set<number> {
  return new Set(
    violations
      .filter((violation) => violation.rule === "C1")
      .map((violation) => violation.stepIndex)
  );
}

export async function repairOnce(
  original: Phase4LlmResponse,
  violations: StepViolation[],
  ctx: GuardContext,
  planningBundle?: Phase4PlanningBundle
): Promise<Phase4LlmResponse> {
  const { callLLM } = await import("@/lib/openai");
  const violationList = violations
    .map((violation) => violation.message)
    .join("\n");

  const v7AssumptionIds = [
    ...new Set(
      violations
        .filter((violation) => violation.rule === "V7")
        .map(
          (violation) =>
            original.steps[violation.stepIndex]?.assumptionId ?? null
        )
        .filter((id): id is string => id != null)
    ),
  ];

  const v8AssumptionIds = [
    ...new Set(
      violations
        .filter((violation) => violation.rule === "V8")
        .map(
          (violation) =>
            original.steps[violation.stepIndex]?.assumptionId ?? null
        )
        .filter((id): id is string => id != null)
    ),
  ];

  const v9StepIndices = [
    ...new Set(
      violations
        .filter((violation) => violation.rule === "V9")
        .map((violation) => violation.stepIndex)
    ),
  ];

  const consistencyHints =
    planningBundle && violations.some((v) => v.rule === "C1")
      ? formatConsistencyRepairHints(
          collectConsistencyIssuesForResult(original.steps, planningBundle)
        )
      : null;

  const repairContext = {
    modus: ctx.mode,
    nutzerbedingungen: planningBundle?.constraintsSummary ?? null,
    annahmenPlanung: planningBundle
      ? [...planningBundle.perAssumption.values()].map((p) => ({
          assumptionId: p.assumptionId,
          validationCore: p.validationCore,
          evidenceContract: p.evidenceContract,
          primaryTestSubject: p.primaryTestSubject,
          ausgewaehlterTestansatz: p.selectedCandidate,
        }))
      : null,
    consistencyRepairHints: consistencyHints,
    whitelist: ctx.whitelist.map((candidate) => ({
      id: candidate.id,
      text: candidate.content,
      justification: candidate.justification,
      uncertainty: candidate.uncertainty,
      allowedDecisiveTestSubjects: candidate.allowedDecisiveTestSubjects,
    })),
    validatedChannels: ctx.validatedChannels,
    originalOutput: original,
    violations: violationList,
    v7RepairHints: v7AssumptionIds.map((assumptionId) => {
      const candidate = ctx.whitelist.find((entry) => entry.id === assumptionId);
      return {
        assumptionId,
        allowedDecisiveTestSubjects:
          candidate?.allowedDecisiveTestSubjects ?? [],
        instruction:
          "DECISIVE-testSubject NUR aus allowedDecisiveTestSubjects wählen. REACHABILITY höchstens als SUPPORTING, wenn die Annahme keine Erreichbarkeits-Unsicherheit prüft.",
      };
    }),
    v8RepairHints: v8AssumptionIds.map((assumptionId) => {
      const candidate = ctx.whitelist.find((entry) => entry.id === assumptionId);
      return {
        assumptionId,
        uncertainty: candidate?.uncertainty ?? null,
        instruction:
          "Jede DECISIVE-Metrik braucht proxyStrength und signalRationale. Anmeldung/Registrierung/Klick = PROXY für Nutzung, nicht DIRECT.",
      };
    }),
    v9RepairHints: v9StepIndices.map((stepIndex) => {
      const step = original.steps[stepIndex];
      const foreignPlatforms = findForeignPlatformsInChannel(
        step?.channel,
        ctx.availablePlatformKeys ?? []
      );
      return {
        stepIndex: stepIndex + 1,
        assumptionId: step?.assumptionId ?? null,
        foreignPlatforms,
        verfuegbareKanaele: {
          kanaele: ctx.availableChannelLabels ?? [],
          vertriebskanaele: ctx.availableSalesChannels ?? [],
          platformKeys: ctx.availablePlatformKeys ?? [],
        },
        instruction:
          "Ersetze den betroffenen Schritt vollständig (validationQuestion, testDesign, title, description, marketingActivities, channel, metrics). Wähle einen Kanal aus verfuegbareKanaele. Keine fremde Plattform. Keine stille Korrektur nur im channel-Feld — Testdesign und Aktivitäten müssen zum neuen Kanal passen.",
      };
    }),
  };

  return callLLM(
    PHASE4_REPAIR_PROMPT,
    repairContext,
    phase4LlmResponseSchema,
    { validationRetries: 0 }
  );
}

export async function processLlmResult(
  initial: Phase4LlmResponse,
  ctx: GuardContext,
  planningBundle?: Phase4PlanningBundle
): Promise<GuardProcessResult> {
  const log: string[] = [];
  let repairTriggered = false;
  let repairSucceeded = false;

  if (planningBundle && planningBundle.compoundClaimErrors.length > 0) {
    log.push(
      `Planungsfehler: ${planningBundle.compoundClaimErrors.map((e) => e.code).join(", ")}`
    );
    console.warn(
      "[phase4/guards] Zusammengesetzte Annahmen:",
      planningBundle.compoundClaimErrors
    );
  }

  let result = applyDerivedStrategyDimensions(initial, ctx);
  if (planningBundle) {
    result = applyPlanningToSteps(result, planningBundle);
  }
  result = applyProxyStrengthCorrections(result);
  let violations = collectStepViolations(result, ctx, planningBundle);

  const c1BeforeFirstRepair = c1ViolationStepIndices(violations);

  const v9BeforeRepair = new Map<number, string[]>();
  for (const violation of violations) {
    if (violation.rule !== "V9") continue;
    const step = result.steps[violation.stepIndex];
    if (!step) continue;
    v9BeforeRepair.set(
      violation.stepIndex,
      findForeignPlatformsInChannel(step.channel, ctx.availablePlatformKeys ?? [])
    );
  }

  if (violations.length > 0) {
    log.push(
      `Erstvalidierung: ${violations.length} Verstoß/Verstöße — ${violations.map((violation) => violation.rule).join(", ")}`
    );
    console.log("[phase4/guards] Erstvalidierung:", violations);

    repairTriggered = true;
    try {
      result = applyDerivedStrategyDimensions(
        await repairOnce(result, violations, ctx, planningBundle),
        ctx
      );
      if (planningBundle) {
        result = applyPlanningToSteps(result, planningBundle);
      }
      result = applyProxyStrengthCorrections(result);
      repairSucceeded = true;
      log.push("Repair-Call ausgelöst und erfolgreich geparst.");
      console.log("[phase4/guards] Repair-Call erfolgreich.");
    } catch (error) {
      log.push("Repair-Call fehlgeschlagen — Originalausgabe wird weiterverarbeitet.");
      console.error("[phase4/guards] Repair-Call fehlgeschlagen:", error);
    }

    violations = collectStepViolations(result, ctx, planningBundle);
    const remainingV9 = violations.filter((violation) => violation.rule === "V9");
    if (v9BeforeRepair.size > 0) {
      logV9RepairOutcome(result, ctx, v9BeforeRepair, remainingV9);
      if (remainingV9.length > 0) {
        log.push(
          `V9 Fail-open: ${remainingV9.length} Schritt(e) nach Repair weiterhin mit fremder Plattform → Soft-Warnung`
        );
      } else {
        log.push("V9 Repair: alle fremden Plattformen im channel korrigiert.");
      }
    }
    if (violations.length > 0) {
      log.push(
        `Nach Repair: ${violations.length} verbleibender Verstoß/Verstöße — ${violations.map((violation) => violation.rule).join(", ")}`
      );
      console.log("[phase4/guards] Nach Repair:", violations);
    } else {
      log.push("Nach Repair: alle Regeln erfüllt.");
    }

    const c1AfterFirstRepair = c1ViolationStepIndices(violations);
    const c1NewlyAfterV9Repair = [...c1AfterFirstRepair].filter(
      (stepIndex) =>
        v9BeforeRepair.has(stepIndex) || !c1BeforeFirstRepair.has(stepIndex)
    );

    if (
      repairSucceeded &&
      v9BeforeRepair.size > 0 &&
      c1AfterFirstRepair.size > 0
    ) {
      log.push(
        `C1 nach V9-Repair: ${c1AfterFirstRepair.size} Schritt(e) mit C1 — ${c1NewlyAfterV9Repair.length} neu betroffen (Indizes: ${[...c1AfterFirstRepair].map((i) => i + 1).join(", ")})`
      );
      console.log(
        "[phase4/guards] C1 nach V9-Repair neu aufgetreten:",
        {
          c1StepIndices: [...c1AfterFirstRepair],
          newlyAffected: c1NewlyAfterV9Repair,
        }
      );

      try {
        result = applyDerivedStrategyDimensions(
          await repairOnce(result, violations, ctx, planningBundle),
          ctx
        );
        if (planningBundle) {
          result = applyPlanningToSteps(result, planningBundle);
        }
        result = applyProxyStrengthCorrections(result);
        violations = collectStepViolations(result, ctx, planningBundle);
        log.push("C1-Repair-Call (nach V9) ausgelöst und erfolgreich geparst.");
        console.log("[phase4/guards] C1-Repair-Call (nach V9) erfolgreich.");

        const c1AfterSecondRepair = c1ViolationStepIndices(violations);
        if (c1AfterSecondRepair.size === 0) {
          log.push("C1-Repair nach V9 erfolgreich — alle C1-Verstöße behoben.");
          console.log(
            "[phase4/guards] C1-Repair nach V9 erfolgreich — alle C1-Verstöße behoben."
          );
        } else {
          log.push(
            `C1-Repair nach V9: ${c1AfterSecondRepair.size} Verstoß/Verstöße verbleiben — strukturelles Verwerfen.`
          );
          console.log(
            "[phase4/guards] C1-Repair nach V9: Verstöße verbleiben — strukturelles Verwerfen:",
            [...c1AfterSecondRepair]
          );
        }

        if (violations.length > 0) {
          log.push(
            `Nach C1-Repair: ${violations.length} verbleibender Verstoß/Verstöße — ${violations.map((violation) => violation.rule).join(", ")}`
          );
          console.log("[phase4/guards] Nach C1-Repair:", violations);
        } else {
          log.push("Nach C1-Repair: alle Regeln erfüllt.");
        }
      } catch (error) {
        log.push(
          "C1-Repair-Call (nach V9) fehlgeschlagen — Verstöße bleiben, strukturelles Verwerfen."
        );
        console.error(
          "[phase4/guards] C1-Repair-Call (nach V9) fehlgeschlagen:",
          error
        );
      }
    }
  } else {
    log.push("Erstvalidierung: alle Regeln erfüllt.");
  }

  const violationsForPost = stripV9Violations(violations);

  const steps = applyChannelPlatformWarnings(
    applyPostValidation(result, violationsForPost),
    ctx
  );

  const processedAssumptionIds = new Set(steps.map((step) => step.assumptionId));
  for (const assumptionId of result.criticalAssumptions) {
    if (processedAssumptionIds.has(assumptionId)) continue;
    const candidate = ctx.whitelist.find((entry) => entry.id === assumptionId);
    const stepViolations = violations.filter(
      (violation) =>
        result.steps[violation.stepIndex]?.assumptionId === assumptionId
    );
    console.log(
      "[phase4/guards] Kritische Annahme ohne gültigen Schritt:",
      {
        assumptionId,
        content: candidate?.content?.slice(0, 120) ?? "(unbekannt)",
        allowedDecisiveTestSubjects:
          candidate?.allowedDecisiveTestSubjects ?? [],
        violations: stepViolations.map((violation) => violation.rule),
      }
    );
    log.push(
      `Annahme ${assumptionId} ohne gültigen Schritt (${stepViolations.map((v) => v.rule).join(", ") || "verworfen"})`
    );
  }

  return {
    steps,
    diversityNote: result.diversityNote ?? null,
    modeNote: result.modeNote ?? null,
    repairTriggered,
    repairSucceeded,
    log,
  };
}
