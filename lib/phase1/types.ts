import type { PestelRelevance, Phase1Statement } from "@/lib/schemas/phase1";
import type { VentureAnchors } from "@/lib/ventureAnchors";

export const PHASE1_MODULE_KEYS = [
  "anchor",
  "pestel",
  "segments",
  "resources",
  "competitors_batch_1",
  "competitors_batch_2",
  "competitors_batch_3",
  "synthesis",
] as const;

export type Phase1ModuleKey = (typeof PHASE1_MODULE_KEYS)[number];

export type Phase1CoreModuleKey = Exclude<
  Phase1ModuleKey,
  "anchor" | "synthesis"
>;

export type CompetitorType =
  | "DIRECT"
  | "INDIRECT"
  | "PRODUCT_ALTERNATIVE"
  | "SERVICE_ALTERNATIVE"
  | "GENERIC_ALTERNATIVE"
  | "MANUAL_ALTERNATIVE"
  | "INTERNAL_SOLUTION"
  | "BUDGET_COMPETITOR"
  | "NON_CONSUMPTION"
  | "EMERGING_ALTERNATIVE";

export type Phase1AnalysisAnchor = {
  marketScope: {
    definition: string;
    geography: string;
    marketStage: string;
    relevantBoundaries: string[];
    excludedBoundaries: string[];
  };
  businessModelCore: {
    offer: string;
    primaryCustomer: string;
    userRoles: string[];
    buyerRoles: string[];
    payerRoles: string[];
    coreProblem: string;
    coreBenefit: string;
    revenueLogic: string;
  };
  startupContext: {
    productStage: string;
    teamSituation: string;
    budgetSituation: string;
    capabilityConstraints: string[];
    dataConstraints: string[];
    operationalConstraints: string[];
  };
  analysisPriorities: {
    relevantPestelDimensions: Array<{
      dimension: string;
      relevance: "HIGH" | "MEDIUM" | "LOW";
      reason: string;
    }>;
    keyCustomerQuestions: string[];
    keyMarketQuestions: string[];
    keyResourceQuestions: string[];
  };
  terminology: {
    preferredTerms: string[];
    ambiguousTerms: Array<{
      term: string;
      definition: string;
    }>;
  };
  competitorPlan: Array<{
    candidateId: string;
    name: string;
    competitorType: CompetitorType | string;
    relevanceReason: string;
    batch: 1 | 2 | 3;
  }>;
  coherenceRules: string[];
  criticalUncertainties: string[];
};

export type CompetitorReplacementRequest = {
  invalidCandidateId: string;
  reason: string;
  proposedReplacement: {
    name: string;
    competitorType: string;
    relevanceReason: string;
  };
};

export type AdoptedContextStatement = {
  category: string;
  content: string;
  evidenceStatus: string;
  origin: string;
  justification: string | null;
  sourceRef: string | null;
  uncertainty: string | null;
  segmentLabel?: string | null;
  segmentAspect?: string | null;
  competitorLabel?: string | null;
  competitorAspect?: string | null;
};

export type Phase1StartupProfile = {
  businessIdea: string | null;
  productStatus: string | null;
  assumedTarget: string | null;
  assumedProblem: string | null;
  valueProposition: string | null;
  revenueIdea: string | null;
  region: string | null;
  teamSize: number | null;
  budgetMonthly: string | null;
  timePerWeek: string | null;
  skillsAndChannels: string | null;
  existingCustomerInsights: string | null;
};

export type Phase1Context = {
  projectId: string;
  runId: string;
  isIncremental: boolean;
  targetCompetitorCount: number;
  adoptedCompetitorLabelCount: number;
  requiredNewProfiles: number;
  ventureAnchors: VentureAnchors;
  adoptedAnchorsForPestel: AdoptedContextStatement[];
  adoptedAnalysis: AdoptedContextStatement[];
  startupProfile: Phase1StartupProfile;
};

export type Phase1ModuleValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type Phase1ModuleValidationResult<T> =
  | {
      success: true;
      data: T;
      warnings: string[];
    }
  | {
      success: false;
      rawData?: unknown;
      issues: Phase1ModuleValidationIssue[];
    };

export type Phase1RepairResponse = {
  repairedObjects: Array<{
    objectId: string;
    replacement: unknown;
  }>;
  addedObjects: unknown[];
};

export type ConsistencyCheckResult = {
  isConsistent: boolean;
  issues: Array<{
    severity: "ERROR" | "WARNING";
    module: string;
    objectId?: string;
    issueType: string;
    explanation: string;
    repairInstruction?: string;
  }>;
};

export type SynthesisInput = {
  anchor: Phase1AnalysisAnchor;
  pestel: Array<{
    refId: string;
    category: string;
    content: string;
    evidenceStatus: string;
  }>;
  segments: Array<{
    refId: string;
    segmentName: string;
    keyCharacteristics: string[];
    keyProblems: string[];
    keyNeeds: string[];
    accessibility: string[];
  }>;
  customerProblems: Array<{
    refId: string;
    content: string;
    evidenceStatus: string;
  }>;
  resources: Array<{
    refId: string;
    category: string;
    content: string;
  }>;
  competitors: Array<{
    refId: string;
    name: string;
    competitorType: string;
    keyOffer: string;
    keyStrengths: string[];
    keyWeaknesses: string[];
    strategicRelevance: string;
  }>;
};

export type Phase1CombinedResult = {
  pestelRelevance: PestelRelevance[];
  statements: Phase1Statement[];
  anchor?: Phase1AnalysisAnchor;
};

export type Phase1Request = {
  projectId: string;
  signal?: AbortSignal;
  emit?: (event: import("./events").Phase1StreamEvent) => void;
};

export type ModuleRunResult<T> = {
  module: Phase1ModuleKey;
  data: T;
  reused: boolean;
  durationMs: number;
  repairCount: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
};
