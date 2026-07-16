import { describe, expect, it } from "vitest";
import { createPhase1ModuleHashes } from "./dependencies";
import { PHASE1_CACHE_VERSIONS } from "./cacheVersions";
import type { Phase1Context } from "./types";

const baseContext: Phase1Context = {
  projectId: "proj-1",
  runId: "run-1",
  isIncremental: false,
  targetCompetitorCount: 6,
  adoptedCompetitorLabelCount: 0,
  requiredNewProfiles: 6,
  ventureAnchors: {
    zielsegment: "KMUs",
    preissegment: null,
    produktkategorie: "SaaS",
    regionMarkt: "DACH",
    fehlendeAnker: [],
  },
  adoptedAnchorsForPestel: [],
  adoptedAnalysis: [],
  startupProfile: {
    businessIdea: "Test",
    productStatus: "MVP",
    assumedTarget: "KMUs",
    assumedProblem: "Chaos",
    valueProposition: "Ordnung",
    revenueIdea: "Abo",
    region: "DACH",
    teamSize: 2,
    budgetMonthly: "5000",
    timePerWeek: "40h",
    skillsAndChannels: "React",
    existingCustomerInsights: null,
  },
};

describe("createPhase1ModuleHashes", () => {
  it("produces identical hashes for same input", () => {
    const a = createPhase1ModuleHashes(baseContext);
    const b = createPhase1ModuleHashes(baseContext);
    expect(a).toEqual(b);
  });

  it("changes synthesis hash when pestel input changes", () => {
    const base = createPhase1ModuleHashes(baseContext);
    const changed = createPhase1ModuleHashes({
      ...baseContext,
      startupProfile: {
        ...baseContext.startupProfile,
        businessIdea: "Changed idea",
      },
    });
    expect(changed.pestel).not.toBe(base.pestel);
    expect(changed.synthesis).not.toBe(base.synthesis);
  });

  it("changes resources hash when team size changes", () => {
    const base = createPhase1ModuleHashes(baseContext);
    const changed = createPhase1ModuleHashes({
      ...baseContext,
      startupProfile: {
        ...baseContext.startupProfile,
        teamSize: 10,
      },
    });
    expect(changed.resources).not.toBe(base.resources);
    expect(changed.synthesis).not.toBe(base.synthesis);
  });

  it("includes cache version in hash composition", () => {
    expect(PHASE1_CACHE_VERSIONS.schemaVersion).toBe(
      "compact-v3-segment-profile"
    );
  });
});
