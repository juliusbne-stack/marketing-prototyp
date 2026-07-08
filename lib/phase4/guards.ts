import type {
  EvidenceStatus,
  StrategyDimension,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PHASE4_REPAIR_PROMPT } from "@/lib/prompts/phase4Repair";
import type { SignalCategoryValue, TestSubjectValue } from "@/lib/schemas/metric";
import {
  phase4LlmResponseSchema,
  type Phase4LlmResponse,
  type Phase4StepOutput,
} from "@/lib/schemas/phase4";
import type { Phase4Mode } from "@/lib/phase4/types";
import { statementCategoryToStrategyDimension } from "./strategyDimension";

export type WhitelistCandidate = {
  id: string;
  content: string;
  evidenceStatus: EvidenceStatus;
  strategyDimension: StrategyDimension | null;
  category: string;
};

export type GuardContext = {
  mode: Phase4Mode;
  whitelist: WhitelistCandidate[];
  validatedChannels: string[];
  whitelistSingleDimension: boolean;
};

export type StepViolation = {
  stepIndex: number;
  rule: "V1" | "V2" | "V3" | "V3b" | "V4" | "V5" | "V6";
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
              evidenceStatus: true,
              adopted: true,
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
          statement.adopted &&
          (statement.evidenceStatus === "ASSUMPTION" ||
            statement.evidenceStatus === "OPEN_QUESTION")
      )
      .map((statement) => ({
        id: statement.id,
        content: statement.content,
        evidenceStatus: statement.evidenceStatus,
        strategyDimension: statementCategoryToStrategyDimension(
          statement.category
        ),
        category: statement.category,
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
        statement.adopted &&
        statement.evidenceStatus === "FACT" &&
        scalingIds.has(statement.id)
    );

  return candidates.map((statement) => ({
    id: statement.id,
    content: statement.content,
    evidenceStatus: statement.evidenceStatus,
    strategyDimension: statementCategoryToStrategyDimension(statement.category),
    category: statement.category,
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

export function computeWhitelistSingleDimension(
  whitelist: WhitelistCandidate[]
): boolean {
  const dimensions = new Set(
    whitelist
      .map((candidate) => candidate.strategyDimension)
      .filter((dimension): dimension is StrategyDimension => dimension != null)
  );
  return dimensions.size <= 1;
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
      !ctx.whitelistSingleDimension
    ) {
      const dimensions = new Set(
        result.steps.map((entry) => entry.strategyDimension)
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
  });

  return violations;
}

function methodWarningForViolation(violation: StepViolation): string | null {
  if (violation.rule === "V4" || violation.rule === "V5") {
    return "Hinweis: Das entscheidende Signal dieses Schritts misst Aufmerksamkeit oder passt nicht zur geprüften Aussage und kann sie nicht belegen. Bitte vor Übernahme anpassen.";
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
  const structuralRules = new Set(["V1", "V2", "V3", "V3b"]);
  const warnableRules = new Set(["V4", "V5", "V6"]);

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

export async function repairOnce(
  original: Phase4LlmResponse,
  violations: StepViolation[],
  ctx: GuardContext
): Promise<Phase4LlmResponse> {
  const { callLLM } = await import("@/lib/openai");
  const violationList = violations
    .map((violation) => violation.message)
    .join("\n");

  const repairContext = {
    modus: ctx.mode,
    whitelist: ctx.whitelist,
    validatedChannels: ctx.validatedChannels,
    originalOutput: original,
    violations: violationList,
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
  ctx: GuardContext
): Promise<GuardProcessResult> {
  const log: string[] = [];
  let repairTriggered = false;
  let repairSucceeded = false;

  let result = initial;
  let violations = validateSteps(result, ctx);

  if (violations.length > 0) {
    log.push(
      `Erstvalidierung: ${violations.length} Verstoß/Verstöße — ${violations.map((violation) => violation.rule).join(", ")}`
    );
    console.log("[phase4/guards] Erstvalidierung:", violations);

    repairTriggered = true;
    try {
      result = await repairOnce(result, violations, ctx);
      repairSucceeded = true;
      log.push("Repair-Call ausgelöst und erfolgreich geparst.");
      console.log("[phase4/guards] Repair-Call erfolgreich.");
    } catch (error) {
      log.push("Repair-Call fehlgeschlagen — Originalausgabe wird weiterverarbeitet.");
      console.error("[phase4/guards] Repair-Call fehlgeschlagen:", error);
    }

    violations = validateSteps(result, ctx);
    if (violations.length > 0) {
      log.push(
        `Nach Repair: ${violations.length} verbleibender Verstoß/Verstöße — ${violations.map((violation) => violation.rule).join(", ")}`
      );
      console.log("[phase4/guards] Nach Repair:", violations);
    } else {
      log.push("Nach Repair: alle Regeln erfüllt.");
    }
  } else {
    log.push("Erstvalidierung: alle Regeln erfüllt.");
  }

  const steps = applyPostValidation(result, violations);

  return {
    steps,
    diversityNote: result.diversityNote ?? null,
    modeNote: result.modeNote ?? null,
    repairTriggered,
    repairSucceeded,
    log,
  };
}
