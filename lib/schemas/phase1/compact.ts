import { z } from "zod";
import { phase1EvidenceStatus, phase1Origin } from "@/lib/schemas/evidenceStatus";
import { PESTEL_CATEGORIES } from "@/lib/schemas/phase1";
import { SEGMENT_ASPECTS } from "@/lib/segmentAspects";
import { COMPETITOR_ASPECTS } from "@/lib/competitorAspects";

/** Compact LLM output — adopted/phase/isCritical set server-side. */
export const compactStatementSchema = z.object({
  category: z.string().trim().min(1),
  content: z.string().trim().min(1),
  evidenceStatus: phase1EvidenceStatus,
  origin: phase1Origin,
  justification: z.string().trim().min(1),
  sourceRef: z.string().trim().nullish(),
  uncertainty: z.string().trim().nullish(),
  segmentLabel: z.string().trim().min(1).nullish(),
  segmentAspect: z.enum(SEGMENT_ASPECTS).nullish(),
  competitorLabel: z.string().trim().min(1).nullish(),
  competitorAspect: z.enum(COMPETITOR_ASPECTS).nullish(),
});

export type CompactStatement = z.infer<typeof compactStatementSchema>;

export const pestelRelevanceEntryCompactSchema = z.object({
  category: z.enum(PESTEL_CATEGORIES),
  relevant: z.boolean(),
  relevanceJustification: z.string().trim().min(1),
});

export const anchorSchema = z.object({
  marketScope: z.object({
    definition: z.string().trim().min(1),
    geography: z.string().trim().min(1),
    marketStage: z.string().trim().min(1),
    relevantBoundaries: z.array(z.string().trim().min(1)).min(1),
    excludedBoundaries: z.array(z.string().trim().min(1)),
  }),
  businessModelCore: z.object({
    offer: z.string().trim().min(1),
    primaryCustomer: z.string().trim().min(1),
    userRoles: z.array(z.string().trim().min(1)).min(1),
    buyerRoles: z.array(z.string().trim().min(1)).min(1),
    payerRoles: z.array(z.string().trim().min(1)).min(1),
    coreProblem: z.string().trim().min(1),
    coreBenefit: z.string().trim().min(1),
    revenueLogic: z.string().trim().min(1),
  }),
  startupContext: z.object({
    productStage: z.string().trim().min(1),
    teamSituation: z.string().trim().min(1),
    budgetSituation: z.string().trim().min(1),
    capabilityConstraints: z.array(z.string().trim().min(1)),
    dataConstraints: z.array(z.string().trim().min(1)),
    operationalConstraints: z.array(z.string().trim().min(1)),
  }),
  analysisPriorities: z.object({
    relevantPestelDimensions: z
      .array(
        z.object({
          dimension: z.string().trim().min(1),
          relevance: z.enum(["HIGH", "MEDIUM", "LOW"]),
          reason: z.string().trim().min(1),
        })
      )
      .min(1),
    keyCustomerQuestions: z.array(z.string().trim().min(1)).min(1),
    keyMarketQuestions: z.array(z.string().trim().min(1)).min(1),
    keyResourceQuestions: z.array(z.string().trim().min(1)).min(1),
  }),
  terminology: z.object({
    preferredTerms: z.array(z.string().trim().min(1)).min(1),
    ambiguousTerms: z.array(
      z.object({
        term: z.string().trim().min(1),
        definition: z.string().trim().min(1),
      })
    ),
  }),
  competitorPlan: z
    .array(
      z.object({
        candidateId: z.string().trim().min(1),
        name: z.string().trim().min(1),
        competitorType: z.string().trim().min(1),
        relevanceReason: z.string().trim().min(1),
        batch: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      })
    )
    .min(6)
    .max(9),
  coherenceRules: z.array(z.string().trim().min(1)).min(1),
  criticalUncertainties: z.array(z.string().trim().min(1)),
});

export const pestelModuleSchema = z.object({
  pestelRelevance: z.array(pestelRelevanceEntryCompactSchema).length(6),
  statements: z.array(compactStatementSchema).min(0),
});

export const segmentProfileSchema = z.object({
  segmentLabel: z.string().trim().min(1),
  overallDescription: z.string().trim().min(1),
  defaultSourceRef: z.string().trim().nullish(),
  statements: z
    .array(
      compactStatementSchema.extend({
        segmentAspect: z.enum(SEGMENT_ASPECTS),
      })
    )
    .length(5),
});

export const segmentsModuleSchema = z.object({
  segments: z.array(segmentProfileSchema).min(2).max(3),
  customerProblems: z.array(compactStatementSchema).min(2).max(4),
});

export const resourcesModuleSchema = z.object({
  statements: z.array(compactStatementSchema).min(2).max(4),
});

export const competitorProfileSchema = z.object({
  candidateId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  competitorType: z.string().trim().min(1),
  overallDescription: z.string().trim().min(1),
  defaultSourceRef: z.string().trim().nullish(),
  statements: z
    .array(
      compactStatementSchema.extend({
        competitorAspect: z.enum(COMPETITOR_ASPECTS),
      })
    )
    .length(6),
  replacementRequests: z
    .array(
      z.object({
        invalidCandidateId: z.string().trim().min(1),
        reason: z.string().trim().min(1),
        proposedReplacement: z.object({
          name: z.string().trim().min(1),
          competitorType: z.string().trim().min(1),
          relevanceReason: z.string().trim().min(1),
        }),
      })
    )
    .optional(),
});

export const competitorsBatchSchema = z.object({
  profiles: z.array(competitorProfileSchema).min(1).max(3),
  landscapeStatements: z.array(compactStatementSchema).min(0).max(3),
});

export const synthesisModuleSchema = z.object({
  swotStatements: z
    .array(
      compactStatementSchema.extend({
        derivedFrom: z.array(z.string().trim().min(1)).min(1).optional(),
      })
    )
    .min(8),
  marketPathStatements: z.array(compactStatementSchema).min(2).max(3),
});

export const consistencyResponseSchema = z.object({
  isConsistent: z.boolean(),
  issues: z.array(
    z.object({
      severity: z.enum(["ERROR", "WARNING"]),
      module: z.string().trim().min(1),
      objectId: z.string().trim().optional(),
      issueType: z.string().trim().min(1),
      explanation: z.string().trim().min(1),
      repairInstruction: z.string().trim().optional(),
    })
  ),
});

export const repairResponseSchema = z.object({
  repairedObjects: z.array(
    z.object({
      objectId: z.string().trim().min(1),
      replacement: z.unknown(),
    })
  ),
  addedObjects: z.array(z.unknown()),
});
