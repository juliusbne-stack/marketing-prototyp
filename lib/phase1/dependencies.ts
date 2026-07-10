import { hashStable } from "./hashing";
import { PHASE1_CACHE_VERSIONS } from "./cacheVersions";
import type { Phase1Context } from "./types";

/** Declarative input dependencies per module — used for cache hash composition. */
export const PHASE1_MODULE_DEPENDENCIES = {
  anchor: [
    "businessIdea",
    "offer",
    "targetGroup",
    "customerProblem",
    "marketRegion",
    "productStatus",
    "resources",
    "adoptedContext",
    "targetCompetitorCount",
  ],
  pestel: [
    "anchor.marketScope",
    "marketRegion",
    "industry",
    "adoptedContext",
  ],
  segments: [
    "anchor.businessModelCore",
    "targetGroup",
    "customerProblem",
    "marketRegion",
    "productStatus",
    "adoptedContext",
  ],
  resources: [
    "teamSize",
    "budget",
    "skills",
    "timeCapacity",
    "productStatus",
    "adoptedContext",
  ],
  competitors: [
    "anchor.competitorPlan",
    "anchor.marketScope",
    "offer",
    "targetGroup",
    "customerProblem",
    "marketRegion",
    "adoptedContext",
    "targetCompetitorCount",
  ],
  synthesis: [
    "anchorHash",
    "pestelHash",
    "segmentsHash",
    "resourcesHash",
    "competitorsHash",
  ],
} as const;

export type Phase1ModuleHashKey = keyof typeof PHASE1_MODULE_DEPENDENCIES;

function withCacheVersion(input: Record<string, unknown>) {
  return { ...PHASE1_CACHE_VERSIONS, input };
}

export function createPhase1ModuleHashes(context: Phase1Context) {
  const adopted = context.adoptedAnalysis;
  const profile = context.startupProfile;

  const anchorInput = {
    profile,
    ventureAnchors: context.ventureAnchors,
    adopted,
    targetCompetitorCount: context.targetCompetitorCount,
  };

  const anchorHash = hashStable(withCacheVersion(anchorInput));

  const pestelHash = hashStable(
    withCacheVersion({
      profile,
      ventureAnchors: context.ventureAnchors,
      adoptedPestel: adopted.filter((s) => s.category.startsWith("PESTEL_")),
    })
  );

  const segmentsHash = hashStable(
    withCacheVersion({
      profile,
      adoptedSegments: adopted.filter(
        (s) =>
          s.category === "TARGET_SEGMENT" || s.category === "CUSTOMER_PROBLEM"
      ),
    })
  );

  const resourcesHash = hashStable(
    withCacheVersion({
      teamSize: profile.teamSize,
      budget: profile.budgetMonthly,
      skills: profile.skillsAndChannels,
      time: profile.timePerWeek,
      productStatus: profile.productStatus,
      adoptedResources: adopted.filter((s) => s.category === "RESOURCE"),
    })
  );

  const competitorsHash = hashStable(
    withCacheVersion({
      offer: profile.businessIdea,
      target: profile.assumedTarget,
      problem: profile.assumedProblem,
      region: profile.region,
      targetCompetitorCount: context.targetCompetitorCount,
      adoptedCompetitors: adopted.filter((s) => s.category === "COMPETITOR"),
    })
  );

  const synthesisHash = hashStable(
    withCacheVersion({
      anchorHash,
      pestelHash,
      segmentsHash,
      resourcesHash,
      competitorsHash,
    })
  );

  return {
    anchor: anchorHash,
    pestel: pestelHash,
    segments: segmentsHash,
    resources: resourcesHash,
    competitors: competitorsHash,
    synthesis: synthesisHash,
  };
}
