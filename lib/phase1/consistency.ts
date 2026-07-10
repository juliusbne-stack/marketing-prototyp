import { callLLMStructured } from "@/lib/openaiStructured";
import {
  consistencyResponseSchema,
} from "@/lib/schemas/phase1/compact";
import { PHASE1_CONSISTENCY_PROMPT } from "@/lib/prompts/phase1/consistency";
import { buildModuleUserPrompt } from "@/lib/prompts/phase1/shared";
import { phase1Config } from "./config";
import { validateCombinedPhase1 } from "./validation";
import type { ConsistencyCheckResult, Phase1AnalysisAnchor } from "./types";
import type { Phase1Statement } from "@/lib/schemas/phase1";
import { withAbortTimeout } from "./concurrency";

export { Phase1ConsistencyError, getBlockingConsistencyErrors, hasBlockingConsistencyErrors } from "./consistencyGate";
export type { ConsistencyIssue } from "./consistencyGate";

export async function checkPhase1Consistency(options: {
  anchor: Phase1AnalysisAnchor;
  statements: Phase1Statement[];
  competitorLabels: Set<string>;
  targetCompetitorCount: number;
  signal?: AbortSignal;
}): Promise<ConsistencyCheckResult> {
  const programmatic = validateCombinedPhase1({
    statements: options.statements,
    competitorLabels: options.competitorLabels,
    targetCompetitorCount: options.targetCompetitorCount,
  });

  const programmaticErrors = programmatic.map((issue) => ({
    severity: "ERROR" as const,
    module: "programmatic",
    issueType: issue.code,
    explanation: issue.message,
  }));

  if (!phase1Config.consistencyCheck) {
    return {
      isConsistent: programmaticErrors.length === 0,
      issues: programmaticErrors,
    };
  }

  const userPrompt = buildModuleUserPrompt({
    anchor: options.anchor,
    startupProfile: {},
    moduleTask: `${PHASE1_CONSISTENCY_PROMPT}

Normalisiertes Analysebild (Kurzfassung):
${JSON.stringify(
  options.statements.map((s) => ({
    category: s.category,
    content: s.content.slice(0, 200),
    segmentLabel: s.segmentLabel,
    competitorLabel: s.competitorLabel,
  })),
  null,
  2
)}`,
  });

  try {
    const llmResult = await withAbortTimeout(
      callLLMStructured({
        model: phase1Config.models.consistency,
        systemPrompt: PHASE1_CONSISTENCY_PROMPT,
        userPrompt,
        schema: consistencyResponseSchema,
        schemaName: "phase1_consistency",
        signal: options.signal,
        serviceTier: phase1Config.serviceTier,
        module: "consistency",
      }),
      phase1Config.consistencyTimeoutMs,
      options.signal
    );

    const issues = [
      ...programmaticErrors,
      ...llmResult.data.issues.map((issue) => ({
        severity: issue.severity,
        module: issue.module,
        objectId: issue.objectId,
        issueType: issue.issueType,
        explanation: issue.explanation,
        repairInstruction: issue.repairInstruction,
      })),
    ];

    const hasErrors = issues.some((i) => i.severity === "ERROR");
    return {
      isConsistent: !hasErrors && llmResult.data.isConsistent,
      issues,
    };
  } catch {
    return {
      isConsistent: programmaticErrors.length === 0,
      issues: programmaticErrors,
    };
  }
}
