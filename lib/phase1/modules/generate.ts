import { callLLMStructured } from "@/lib/openaiStructured";
import {
  anchorSchema,
  competitorsBatchSchema,
  pestelModuleSchema,
  resourcesModuleSchema,
  segmentsModuleSchema,
  synthesisModuleSchema,
} from "@/lib/schemas/phase1/compact";
import { PHASE1_ANCHOR_PROMPT } from "@/lib/prompts/phase1/anchor";
import { PHASE1_PESTEL_PROMPT } from "@/lib/prompts/phase1/pestel";
import { PHASE1_SEGMENTS_PROMPT } from "@/lib/prompts/phase1/segments";
import { PHASE1_RESOURCES_PROMPT } from "@/lib/prompts/phase1/resources";
import { buildCompetitorsBatchPrompt } from "@/lib/prompts/phase1/competitors";
import { PHASE1_SYNTHESIS_PROMPT } from "@/lib/prompts/phase1/synthesis";
import { buildModuleUserPrompt } from "@/lib/prompts/phase1/shared";
import { phase1Config } from "../config";
import { withAbortTimeout, throwIfAborted, isAbortError } from "../concurrency";
import {
  normalizeCompetitorProfile,
  normalizeSegmentProfile,
  normalizeCompactStatement,
  normalizeCompactStatements,
  normalizeSwotStatement,
} from "../normalize";
import {
  validateCompetitorsBatch,
  validatePestelModule,
  validateResourcesModule,
  validateSegmentsModule,
  validateSynthesisModule,
} from "../validation";
import { assignBatchesToCompetitorPlan, getBatchCandidates } from "../competitorBatches";
import { buildSynthesisInput } from "../combine";
import {
  runModuleRepair,
  Phase1ModuleError,
} from "../moduleRepair";
import {
  applyReplacementToAnchor,
  buildReplacementRetryPrompt,
  validateReplacementRequest,
} from "../replacement";
import type {
  CompetitorReplacementRequest,
  Phase1AnalysisAnchor,
  Phase1Context,
  Phase1ModuleKey,
} from "../types";
import type { Phase1Statement, PestelRelevance } from "@/lib/schemas/phase1";
import { REQUIRED_GENERATED_SEGMENT_ASPECTS } from "@/lib/segmentAspects";
import type { Phase1StreamEvent } from "../events";
import { createPreviewId } from "../hashing";
import { z } from "zod";

type EmitFn = (event: Phase1StreamEvent) => void;

type SegmentsModuleData = z.infer<typeof segmentsModuleSchema>;
type ResourcesModuleData = z.infer<typeof resourcesModuleSchema>;
type CompetitorsBatchData = z.infer<typeof competitorsBatchSchema>;
type SynthesisModuleData = z.infer<typeof synthesisModuleSchema>;
type PestelModuleData = z.infer<typeof pestelModuleSchema>;

function emitStatements(
  emit: EmitFn | undefined,
  module: Phase1ModuleKey,
  statements: Phase1Statement[],
  startIndex = 0
): void {
  if (!emit) return;
  statements.forEach((statement, offset) => {
    emit({
      type: "statement",
      module,
      previewId: createPreviewId(module, startIndex + offset),
      data: statement,
    });
  });
}

function normalizeSegmentsData(data: SegmentsModuleData) {
  const segmentStatements = data.segments.flatMap((segment) =>
    normalizeSegmentProfile(segment)
  );
  const customerProblems = data.customerProblems.map((statement) =>
    normalizeCompactStatement({ ...statement, category: "CUSTOMER_PROBLEM" })
  );
  return { segmentStatements, customerProblems };
}

function validateSegmentsData(
  data: SegmentsModuleData,
  segmentStatements: Phase1Statement[],
  customerProblems: Phase1Statement[]
) {
  return validateSegmentsModule({
    segments: data.segments.map((segment) => ({
      segmentLabel: segment.segmentLabel,
      statements: segmentStatements.filter(
        (s) => s.segmentLabel === segment.segmentLabel
      ),
    })),
    customerProblems,
  });
}

async function repairAndValidateSegments(
  anchor: Phase1AnalysisAnchor,
  data: SegmentsModuleData,
  issues: import("../types").Phase1ModuleValidationIssue[],
  signal?: AbortSignal,
  emit?: EmitFn
): Promise<{ data: SegmentsModuleData; repairCount: number }> {
  const validSegments = data.segments.filter((segment) => {
    const aspects = new Set(segment.statements.map((s) => s.segmentAspect));
    return REQUIRED_GENERATED_SEGMENT_ASPECTS.every((aspect) =>
      aspects.has(aspect)
    );
  });

  const repaired = await runModuleRepair<SegmentsModuleData>({
    module: "segments",
    anchor,
    invalidResult: data,
    issues,
    validParts: { segments: validSegments, customerProblems: data.customerProblems },
    immutableParts: validSegments.map((s) => s.segmentLabel),
    signal,
    emit,
    affectedItems: issues.map((i) => i.path),
  });

  if (!repaired.success || !repaired.data) {
    throw new Phase1ModuleError("segments", "Segment-Modul konnte nicht repariert werden.", true);
  }

  const normalized = normalizeSegmentsData(repaired.data);
  const revalidated = validateSegmentsData(
    repaired.data,
    normalized.segmentStatements,
    normalized.customerProblems
  );
  if (!revalidated.success) {
    throw new Phase1ModuleError("segments", "Segment-Reparatur unvollständig.", true);
  }

  return { data: repaired.data, repairCount: repaired.repairCount };
}

export async function generateAnchor(
  context: Phase1Context,
  signal?: AbortSignal,
  emit?: EmitFn
): Promise<Phase1AnalysisAnchor> {
  emit?.({ type: "anchor_started" });
  throwIfAborted(signal);

  const userPrompt = buildModuleUserPrompt({
    anchor: context.ventureAnchors,
    startupProfile: context.startupProfile,
    adoptedAnalysis:
      context.adoptedAnalysis.length > 0 ? context.adoptedAnalysis : undefined,
    moduleTask: `${PHASE1_ANCHOR_PROMPT}

targetCompetitorCount=${context.targetCompetitorCount}`,
    extraContext: {
      ventureAnchors: context.ventureAnchors,
      adoptedAnchorsForPestel: context.adoptedAnchorsForPestel,
      targetCompetitorCount: context.targetCompetitorCount,
    },
  });

  const result = await withAbortTimeout(
    callLLMStructured({
      model: phase1Config.models.anchor,
      systemPrompt: PHASE1_ANCHOR_PROMPT,
      userPrompt,
      schema: anchorSchema,
      schemaName: "phase1_anchor",
      signal,
      serviceTier: phase1Config.serviceTier,
      maxTokens: phase1Config.maxTokens,
      module: "anchor",
    }),
    phase1Config.moduleTimeoutMs,
    signal
  );

  const anchor = assignBatchesToCompetitorPlan(
    result.data as Phase1AnalysisAnchor,
    context.targetCompetitorCount
  );
  emit?.({ type: "anchor_completed" });
  return anchor;
}

export async function generatePestelModule(
  context: Phase1Context,
  anchor: Phase1AnalysisAnchor,
  signal?: AbortSignal,
  emit?: EmitFn
) {
  throwIfAborted(signal);
  const userPrompt = buildModuleUserPrompt({
    anchor,
    startupProfile: context.startupProfile,
    adoptedAnalysis:
      context.adoptedAnalysis.length > 0 ? context.adoptedAnalysis : undefined,
    moduleTask: PHASE1_PESTEL_PROMPT,
    extraContext: {
      ventureAnchors: context.ventureAnchors,
      adoptedAnchorsForPestel: context.adoptedAnchorsForPestel,
    },
  });

  const result = await withAbortTimeout(
    callLLMStructured({
      model: phase1Config.models.pestel,
      systemPrompt: PHASE1_PESTEL_PROMPT,
      userPrompt,
      schema: pestelModuleSchema,
      schemaName: "phase1_pestel",
      signal,
      serviceTier: phase1Config.serviceTier,
      module: "pestel",
    }),
    phase1Config.moduleTimeoutMs,
    signal
  );

  let moduleData = result.data as PestelModuleData;
  let repairCount = 0;
  let statements = normalizeCompactStatements(moduleData.statements);
  let pestelRelevance = moduleData.pestelRelevance as PestelRelevance[];
  let validated = validatePestelModule({ pestelRelevance, statements });

  if (!validated.success) {
    const validStatements = statements.filter((s) => s.content.trim());
    const repaired = await runModuleRepair<PestelModuleData>({
      module: "pestel",
      anchor,
      invalidResult: moduleData,
      issues: validated.issues,
      validParts: { statements: validStatements, pestelRelevance },
      signal,
      emit,
    });
    if (!repaired.success || !repaired.data) {
      throw new Phase1ModuleError("pestel", "PESTEL-Modul konnte nicht repariert werden.", true);
    }
    moduleData = repaired.data;
    repairCount = repaired.repairCount;
    statements = normalizeCompactStatements(moduleData.statements);
    pestelRelevance = moduleData.pestelRelevance as PestelRelevance[];
    validated = validatePestelModule({ pestelRelevance, statements });
    if (!validated.success) {
      throw new Phase1ModuleError("pestel", "PESTEL-Reparatur unvollständig.", true);
    }
  }

  emitStatements(emit, "pestel", statements);
  return {
    pestelRelevance,
    statements,
    repairCount,
    usage: result.usage,
    durationMs: result.durationMs,
  };
}

export async function generateSegmentsModule(
  context: Phase1Context,
  anchor: Phase1AnalysisAnchor,
  signal?: AbortSignal,
  emit?: EmitFn
) {
  throwIfAborted(signal);
  const userPrompt = buildModuleUserPrompt({
    anchor,
    startupProfile: context.startupProfile,
    adoptedAnalysis:
      context.adoptedAnalysis.length > 0 ? context.adoptedAnalysis : undefined,
    moduleTask: PHASE1_SEGMENTS_PROMPT,
  });

  const result = await withAbortTimeout(
    callLLMStructured({
      model: phase1Config.models.segments,
      systemPrompt: PHASE1_SEGMENTS_PROMPT,
      userPrompt,
      schema: segmentsModuleSchema,
      schemaName: "phase1_segments",
      signal,
      serviceTier: phase1Config.serviceTier,
      module: "segments",
    }),
    phase1Config.moduleTimeoutMs,
    signal
  );

  let moduleData = result.data as SegmentsModuleData;
  let repairCount = 0;
  let { segmentStatements, customerProblems } = normalizeSegmentsData(moduleData);
  const validated = validateSegmentsData(
    moduleData,
    segmentStatements,
    customerProblems
  );

  if (!validated.success) {
    const repaired = await repairAndValidateSegments(
      anchor,
      moduleData,
      validated.issues,
      signal,
      emit
    );
    moduleData = repaired.data;
    repairCount = repaired.repairCount;
    ({ segmentStatements, customerProblems } = normalizeSegmentsData(moduleData));
  }

  const allStatements = [...segmentStatements, ...customerProblems];
  emitStatements(emit, "segments", allStatements);
  return {
    segmentStatements,
    customerProblems,
    repairCount,
    usage: result.usage,
    durationMs: result.durationMs,
  };
}

export async function generateResourcesModule(
  context: Phase1Context,
  anchor: Phase1AnalysisAnchor,
  signal?: AbortSignal,
  emit?: EmitFn
) {
  throwIfAborted(signal);
  const userPrompt = buildModuleUserPrompt({
    anchor,
    startupProfile: context.startupProfile,
    adoptedAnalysis:
      context.adoptedAnalysis.length > 0 ? context.adoptedAnalysis : undefined,
    moduleTask: PHASE1_RESOURCES_PROMPT,
  });

  const result = await withAbortTimeout(
    callLLMStructured({
      model: phase1Config.models.resources,
      systemPrompt: PHASE1_RESOURCES_PROMPT,
      userPrompt,
      schema: resourcesModuleSchema,
      schemaName: "phase1_resources",
      signal,
      serviceTier: phase1Config.serviceTier,
      module: "resources",
    }),
    phase1Config.moduleTimeoutMs,
    signal
  );

  let moduleData = result.data as ResourcesModuleData;
  let repairCount = 0;
  let statements = moduleData.statements.map((statement) =>
    normalizeCompactStatement({ ...statement, category: "RESOURCE" })
  );
  let validated = validateResourcesModule({ statements });

  if (!validated.success) {
    const validStatements = statements.filter((s) => s.content.trim());
    const repaired = await runModuleRepair<ResourcesModuleData>({
      module: "resources",
      anchor,
      invalidResult: moduleData,
      issues: validated.issues,
      validParts: { statements: validStatements },
      signal,
      emit,
    });
    if (!repaired.success || !repaired.data) {
      throw new Phase1ModuleError("resources", "Ressourcen-Modul konnte nicht repariert werden.", true);
    }
    moduleData = repaired.data;
    repairCount = repaired.repairCount;
    statements = moduleData.statements.map((statement) =>
      normalizeCompactStatement({ ...statement, category: "RESOURCE" })
    );
    validated = validateResourcesModule({ statements });
    if (!validated.success) {
      throw new Phase1ModuleError("resources", "Ressourcen-Reparatur unvollständig.", true);
    }
  }

  emitStatements(emit, "resources", statements);
  return {
    statements,
    repairCount,
    usage: result.usage,
    durationMs: result.durationMs,
  };
}

async function generateSingleCompetitorProfile(
  anchor: Phase1AnalysisAnchor,
  context: Phase1Context,
  candidateId: string,
  batch: 1 | 2 | 3,
  signal?: AbortSignal,
  extraTask?: string
): Promise<CompetitorsBatchData["profiles"][number]> {
  const candidate = anchor.competitorPlan.find((c) => c.candidateId === candidateId);
  if (!candidate) {
    throw new Error(`Kandidat ${candidateId} nicht im Plan.`);
  }

  const prompt = buildCompetitorsBatchPrompt(batch);
  const userPrompt = buildModuleUserPrompt({
    anchor,
    startupProfile: context.startupProfile,
    adoptedAnalysis:
      context.adoptedAnalysis.length > 0 ? context.adoptedAnalysis : undefined,
    moduleTask: `${prompt}

Erzeuge NUR das Profil für Kandidat ${candidate.name} (${candidateId}).
${extraTask ?? ""}`,
    extraContext: { batch, plannedCandidates: [candidate] },
  });

  const singleProfileSchema = z.object({
    profile: competitorsBatchSchema.shape.profiles.element,
  });

  const result = await withAbortTimeout(
    callLLMStructured({
      model: phase1Config.models.competitors,
      systemPrompt: prompt,
      userPrompt,
      schema: singleProfileSchema,
      schemaName: `phase1_competitor_profile_${candidateId}`,
      signal,
      serviceTier: phase1Config.serviceTier,
      module: `competitors_batch_${batch}` as Phase1ModuleKey,
    }),
    phase1Config.moduleTimeoutMs,
    signal
  );

  return result.data.profile;
}

async function processReplacementRequests(
  anchor: Phase1AnalysisAnchor,
  context: Phase1Context,
  batch: 1 | 2 | 3,
  profiles: CompetitorsBatchData["profiles"],
  signal?: AbortSignal
): Promise<{
  anchor: Phase1AnalysisAnchor;
  profiles: CompetitorsBatchData["profiles"];
}> {
  let workingAnchor = anchor;
  const updatedProfiles = [...profiles];

  for (let i = 0; i < updatedProfiles.length; i++) {
    const profile = updatedProfiles[i];
    const requests = profile.replacementRequests ?? [];
    if (requests.length === 0) continue;

    for (const request of requests) {
      let validation = validateReplacementRequest({ request, anchor: workingAnchor });
      let effectiveRequest = request;

      if (!validation.valid) {
        const retryPrompt = buildReplacementRetryPrompt(request, validation.reason);
        const retried = await generateSingleCompetitorProfile(
          workingAnchor,
          context,
          request.invalidCandidateId,
          batch,
          signal,
          retryPrompt
        );
        const retryRequest = retried.replacementRequests?.[0];
        if (!retryRequest) break;
        validation = validateReplacementRequest({
          request: retryRequest,
          anchor: workingAnchor,
        });
        if (!validation.valid) break;
        effectiveRequest = retryRequest;
      }

      workingAnchor = applyReplacementToAnchor(workingAnchor, effectiveRequest);
      const replacementProfile = await generateSingleCompetitorProfile(
        workingAnchor,
        context,
        effectiveRequest.invalidCandidateId.startsWith("comp-")
          ? workingAnchor.competitorPlan.find(
              (c) =>
                c.name === effectiveRequest.proposedReplacement.name
            )?.candidateId ?? effectiveRequest.invalidCandidateId
          : effectiveRequest.invalidCandidateId,
        batch,
        signal
      );
      updatedProfiles[i] = replacementProfile;
    }
  }

  return { anchor: workingAnchor, profiles: updatedProfiles };
}

export async function generateCompetitorsBatch(
  context: Phase1Context,
  anchor: Phase1AnalysisAnchor,
  batch: 1 | 2 | 3,
  signal?: AbortSignal,
  emit?: EmitFn
): Promise<{
  profileStatements: Phase1Statement[];
  landscapeStatements: Phase1Statement[];
  repairCount: number;
  usage: import("@/lib/openaiStructured").LlmUsage;
  durationMs: number;
  updatedAnchor?: Phase1AnalysisAnchor;
}> {
  throwIfAborted(signal);
  const moduleKey: Phase1ModuleKey = `competitors_batch_${batch}` as Phase1ModuleKey;
  const candidates = getBatchCandidates(anchor, batch);
  const prompt = buildCompetitorsBatchPrompt(batch);

  const userPrompt = buildModuleUserPrompt({
    anchor,
    startupProfile: context.startupProfile,
    adoptedAnalysis:
      context.adoptedAnalysis.length > 0 ? context.adoptedAnalysis : undefined,
    moduleTask: prompt,
    extraContext: { batch, plannedCandidates: candidates },
  });

  const result = await withAbortTimeout(
    callLLMStructured({
      model: phase1Config.models.competitors,
      systemPrompt: prompt,
      userPrompt,
      schema: competitorsBatchSchema,
      schemaName: `phase1_competitors_batch_${batch}`,
      signal,
      serviceTier: phase1Config.serviceTier,
      module: moduleKey,
    }),
    phase1Config.moduleTimeoutMs,
    signal
  );

  let workingAnchor = anchor;
  let moduleData = result.data as CompetitorsBatchData;
  let repairCount = 0;

  const replacementResult = await processReplacementRequests(
    workingAnchor,
    context,
    batch,
    moduleData.profiles,
    signal
  );
  workingAnchor = replacementResult.anchor;
  moduleData = { ...moduleData, profiles: replacementResult.profiles };

  let profileStatements = moduleData.profiles.flatMap((profile) =>
    normalizeCompetitorProfile({
      name: profile.name,
      defaultSourceRef: profile.defaultSourceRef,
      statements: profile.statements,
    })
  );
  const landscapeStatements = moduleData.landscapeStatements.map((statement) =>
    normalizeCompactStatement({ ...statement, category: "COMPETITOR" })
  );

  let validated = validateCompetitorsBatch({
    profiles: moduleData.profiles.map((profile) => ({
      candidateId: profile.candidateId,
      name: profile.name,
      statements: profileStatements.filter(
        (s) => s.competitorLabel === profile.name
      ),
    })),
    landscapeStatements,
    plannedCandidateIds: getBatchCandidates(workingAnchor, batch).map(
      (c) => c.candidateId
    ),
  });

  if (!validated.success) {
    const invalidIds = new Set(
      validated.issues
        .map((i) => i.path.match(/^profiles\.(.+)$/)?.[1])
        .filter(Boolean) as string[]
    );
    const validProfiles = moduleData.profiles.filter(
      (p) => !invalidIds.has(p.candidateId)
    );

    for (const candidateId of invalidIds) {
      throwIfAborted(signal);
      const replacement = await generateSingleCompetitorProfile(
        workingAnchor,
        context,
        candidateId,
        batch,
        signal
      );
      const idx = moduleData.profiles.findIndex(
        (p) => p.candidateId === candidateId
      );
      if (idx >= 0) {
        moduleData.profiles[idx] = replacement;
      } else {
        moduleData.profiles.push(replacement);
      }
      repairCount += 1;
    }

    profileStatements = moduleData.profiles.flatMap((profile) =>
      normalizeCompetitorProfile({
        name: profile.name,
        defaultSourceRef: profile.defaultSourceRef,
        statements: profile.statements,
      })
    );

    validated = validateCompetitorsBatch({
      profiles: moduleData.profiles.map((profile) => ({
        candidateId: profile.candidateId,
        name: profile.name,
        statements: profileStatements.filter(
          (s) => s.competitorLabel === profile.name
        ),
      })),
      landscapeStatements,
      plannedCandidateIds: getBatchCandidates(workingAnchor, batch).map(
        (c) => c.candidateId
      ),
    });

    if (!validated.success) {
      const repaired = await runModuleRepair<CompetitorsBatchData>({
        module: moduleKey,
        anchor: workingAnchor,
        invalidResult: moduleData,
        issues: validated.issues,
        validParts: { profiles: validProfiles },
        signal,
        emit,
      });
      if (!repaired.success || !repaired.data) {
        throw new Phase1ModuleError(
          moduleKey,
          `Wettbewerber-Batch ${batch} konnte nicht repariert werden.`,
          true
        );
      }
      moduleData = repaired.data;
      repairCount += repaired.repairCount;
      profileStatements = moduleData.profiles.flatMap((profile) =>
        normalizeCompetitorProfile({
          name: profile.name,
          defaultSourceRef: profile.defaultSourceRef,
          statements: profile.statements,
        })
      );
      validated = validateCompetitorsBatch({
        profiles: moduleData.profiles.map((profile) => ({
          candidateId: profile.candidateId,
          name: profile.name,
          statements: profileStatements.filter(
            (s) => s.competitorLabel === profile.name
          ),
        })),
        landscapeStatements,
        plannedCandidateIds: getBatchCandidates(workingAnchor, batch).map(
          (c) => c.candidateId
        ),
      });
      if (!validated.success) {
        throw new Phase1ModuleError(
          moduleKey,
          `Wettbewerber-Batch ${batch} Reparatur unvollständig.`,
          true
        );
      }
    }
  }

  emitStatements(emit, moduleKey, [...profileStatements, ...landscapeStatements]);
  return {
    profileStatements,
    landscapeStatements: batch === 1 ? landscapeStatements : [],
    repairCount,
    usage: result.usage,
    durationMs: result.durationMs,
    ...(workingAnchor !== anchor ? { updatedAnchor: workingAnchor } : {}),
  };
}

/**
 * Structured Outputs sichern die Synthese-Form (min. 8 SWOT-Aussagen), aber nicht
 * die Geschäftsregel „≥2 je Quadrant" aus validateSynthesisModule. Ein gezielter
 * Korrektur-Retry mit den konkreten Lücken heilt Verteilungsfehler deutlich
 * zuverlässiger als der generische runModuleRepair.
 */
function buildSynthesisCorrectiveHint(
  issues: import("../types").Phase1ModuleValidationIssue[]
): string {
  return [
    "Deine vorherige Synthese war unvollständig und wurde verworfen. Konkrete Mängel:",
    ...issues.map((i) => `- ${i.message}`),
    "PFLICHT bei der Neuausgabe: je SWOT-Quadrant (SWOT_STRENGTH, SWOT_WEAKNESS, " +
      "SWOT_OPPORTUNITY, SWOT_THREAT) GENAU 2–3 Aussagen mit korrekt gesetztem " +
      "category-Feld, plus mindestens 2 MARKET_PATH-Aussagen. Zähle die Aussagen " +
      "je category VOR der Ausgabe.",
  ].join("\n");
}

export async function generateSynthesis(
  context: Phase1Context,
  anchor: Phase1AnalysisAnchor,
  core: {
    pestelStatements: Phase1Statement[];
    segmentStatements: Phase1Statement[];
    customerProblems: Phase1Statement[];
    resourceStatements: Phase1Statement[];
    competitorStatements: Phase1Statement[];
  },
  signal?: AbortSignal,
  emit?: EmitFn
) {
  throwIfAborted(signal);
  emit?.({ type: "synthesis_started" });
  const synthesisInput = buildSynthesisInput({ anchor, ...core });

  const userPrompt = buildModuleUserPrompt({
    anchor,
    startupProfile: context.startupProfile,
    moduleTask: PHASE1_SYNTHESIS_PROMPT,
    extraContext: { synthesisInput },
  });

  const result = await withAbortTimeout(
    callLLMStructured({
      model: phase1Config.models.synthesis,
      systemPrompt: PHASE1_SYNTHESIS_PROMPT,
      userPrompt,
      schema: synthesisModuleSchema,
      schemaName: "phase1_synthesis",
      signal,
      serviceTier: phase1Config.serviceTier,
      module: "synthesis",
    }),
    phase1Config.synthesisTimeoutMs,
    signal
  );

  let moduleData = result.data as SynthesisModuleData;
  let repairCount = 0;
  let swotStatements = moduleData.swotStatements.map((statement) =>
    normalizeSwotStatement(statement)
  );
  let marketPathStatements = moduleData.marketPathStatements.map((statement) =>
    normalizeCompactStatement({ ...statement, category: "MARKET_PATH" })
  );
  let validated = validateSynthesisModule({ swotStatements, marketPathStatements });

  if (!validated.success) {
    // Gezielter Korrektur-Retry zuerst — heilt Verteilungsfehler (≥2 je Quadrant)
    // zuverlässiger als der generische Repair, der bei Zählfehlern oft null liefert.
    try {
      const retry = await withAbortTimeout(
        callLLMStructured({
          model: phase1Config.models.synthesis,
          systemPrompt: PHASE1_SYNTHESIS_PROMPT,
          userPrompt: `${userPrompt}\n\n${buildSynthesisCorrectiveHint(validated.issues)}`,
          schema: synthesisModuleSchema,
          schemaName: "phase1_synthesis",
          signal,
          serviceTier: phase1Config.serviceTier,
          module: "synthesis",
        }),
        phase1Config.synthesisTimeoutMs,
        signal
      );
      const retryData = retry.data as SynthesisModuleData;
      const retrySwot = retryData.swotStatements.map((statement) =>
        normalizeSwotStatement(statement)
      );
      const retryPaths = retryData.marketPathStatements.map((statement) =>
        normalizeCompactStatement({ ...statement, category: "MARKET_PATH" })
      );
      const retryValidated = validateSynthesisModule({
        swotStatements: retrySwot,
        marketPathStatements: retryPaths,
      });
      if (retryValidated.success) {
        moduleData = retryData;
        swotStatements = retrySwot;
        marketPathStatements = retryPaths;
        repairCount += 1;
        validated = retryValidated;
      }
    } catch (error) {
      if (isAbortError(error)) throw error;
      // sonst: unten den generischen Repair versuchen
    }
  }

  if (!validated.success) {
    const structurallyBroken = validated.issues.length >= 4;
    const validSwot = swotStatements.filter((s) => s.content.trim());
    const validPaths = marketPathStatements.filter((s) => s.content.trim());

    const repaired = await runModuleRepair<SynthesisModuleData>({
      module: "synthesis",
      anchor,
      invalidResult: moduleData,
      issues: validated.issues,
      validParts: structurallyBroken
        ? {}
        : { swotStatements: validSwot, marketPathStatements: validPaths },
      immutableParts: structurallyBroken
        ? []
        : [...validSwot, ...validPaths].map((_, i) => `statement-${i}`),
      signal,
      emit,
    });

    if (!repaired.success || !repaired.data) {
      throw new Phase1ModuleError("synthesis", "Synthese-Modul konnte nicht repariert werden.", true);
    }
    moduleData = repaired.data;
    repairCount = repaired.repairCount;
    swotStatements = moduleData.swotStatements.map((statement) =>
      normalizeSwotStatement(statement)
    );
    marketPathStatements = moduleData.marketPathStatements.map((statement) =>
      normalizeCompactStatement({ ...statement, category: "MARKET_PATH" })
    );
    validated = validateSynthesisModule({ swotStatements, marketPathStatements });
    if (!validated.success) {
      throw new Phase1ModuleError(
        "synthesis",
        `Synthese-Reparatur unvollständig: ${validated.issues
          .map((i) => i.message)
          .join("; ")}`,
        true
      );
    }
  }

  emitStatements(emit, "synthesis", [...swotStatements, ...marketPathStatements]);
  emit?.({ type: "synthesis_completed" });

  return {
    swotStatements,
    marketPathStatements,
    repairCount,
    usage: result.usage,
    durationMs: result.durationMs,
  };
}

export async function repairConsistencyObject(options: {
  anchor: Phase1AnalysisAnchor;
  module: Phase1ModuleKey;
  objectId: string;
  repairInstruction: string;
  currentData: unknown;
  signal?: AbortSignal;
  emit?: EmitFn;
}): Promise<{ repaired: unknown | null; repairCount: number }> {
  const outcome = await runModuleRepair({
    module: options.module,
    anchor: options.anchor,
    invalidResult: options.currentData,
    issues: [
      {
        path: options.objectId,
        code: "CONSISTENCY",
        message: options.repairInstruction,
      },
    ],
    signal: options.signal,
    emit: options.emit,
    affectedItems: [options.objectId],
  });
  return { repaired: outcome.data, repairCount: outcome.repairCount };
}
