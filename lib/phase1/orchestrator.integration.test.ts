import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Phase1StreamEvent } from "./events";

vi.mock("@/lib/openaiStructured", () => ({
  callLLMStructured: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    statement: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    phase1ModuleCache: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
    },
    phase1Run: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) =>
      fn({
        statement: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
          findMany: vi.fn().mockResolvedValue([]),
        },
        project: {
          update: vi.fn(),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ pestelRelevance: [] }),
        },
        phase1Run: {
          findUnique: vi.fn().mockResolvedValue({ status: "RUNNING" }),
          update: vi.fn(),
        },
      })
    ),
  },
}));

vi.mock("./modules/generate", () => ({
  generateAnchor: vi.fn(),
  generatePestelModule: vi.fn(),
  generateSegmentsModule: vi.fn(),
  generateResourcesModule: vi.fn(),
  generateCompetitorsBatch: vi.fn(),
  generateSynthesis: vi.fn(),
}));

vi.mock("./consistency", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./consistency")>();
  return {
    ...actual,
    checkPhase1Consistency: vi.fn().mockResolvedValue({
      isConsistent: true,
      issues: [],
    }),
  };
});

vi.mock("./monolithic", () => ({
  runMonolithicPhase1: vi.fn().mockResolvedValue({
    statements: [],
    pestelRelevance: [],
    incremental: false,
    filteredDuplicateCount: 0,
  }),
}));

import { prisma } from "@/lib/prisma";
import {
  generateAnchor,
  generatePestelModule,
  generateSegmentsModule,
  generateResourcesModule,
  generateCompetitorsBatch,
  generateSynthesis,
} from "./modules/generate";
import { runMonolithicPhase1 } from "./monolithic";
import { checkPhase1Consistency } from "./consistency";
import { runPhase1Analysis, Phase1RunConflictError } from "./orchestrator";
import { Phase1ConsistencyError } from "./consistencyGate";
import { phase1Config } from "./config";

const project = {
  id: "proj-test",
  businessIdea: "SaaS Tool",
  productStatus: "MVP",
  assumedTarget: "KMUs",
  assumedProblem: "Chaos",
  valuePropDraft: "Ordnung",
  revenueIdea: "Abo",
  region: "DACH",
  teamSize: 2,
  budgetMonthly: "5000",
  timePerWeek: "40h",
  skills: "React",
  existingInsights: null,
  pestelRelevance: [],
};

const anchor = {
  marketScope: {
    definition: "B2B",
    geography: "DACH",
    marketStage: "growth",
    relevantBoundaries: ["SMB"],
    excludedBoundaries: [],
  },
  businessModelCore: {
    offer: "Tool",
    primaryCustomer: "SMB",
    userRoles: ["u"],
    buyerRoles: ["b"],
    payerRoles: ["p"],
    coreProblem: "p",
    coreBenefit: "b",
    revenueLogic: "sub",
  },
  startupContext: {
    productStage: "MVP",
    teamSituation: "small",
    budgetSituation: "low",
    capabilityConstraints: [],
    dataConstraints: [],
    operationalConstraints: [],
  },
  analysisPriorities: {
    relevantPestelDimensions: [
      { dimension: "T", relevance: "HIGH" as const, reason: "r" },
    ],
    keyCustomerQuestions: ["q"],
    keyMarketQuestions: ["q"],
    keyResourceQuestions: ["q"],
  },
  terminology: { preferredTerms: ["SaaS"], ambiguousTerms: [] },
  competitorPlan: Array.from({ length: 6 }, (_, i) => ({
    candidateId: `comp-${i + 1}`,
    name: `C${i + 1}`,
    competitorType: "DIRECT",
    relevanceReason: "r",
    batch: ((i % 3) + 1) as 1 | 2 | 3,
  })),
  coherenceRules: ["rule"],
  criticalUncertainties: [],
};

function mockModuleDefaults() {
  vi.mocked(prisma.project.findUniqueOrThrow).mockResolvedValue(project as never);
  vi.mocked(generateAnchor).mockResolvedValue(anchor);
  vi.mocked(generatePestelModule).mockResolvedValue({
    pestelRelevance: [],
    statements: [{ category: "PESTEL_TECHNOLOGICAL" as const, content: "t", evidenceStatus: "ASSUMPTION" as const, origin: "AI_DERIVATION" as const, justification: "j", sourceRef: null }],
    repairCount: 0,
    usage: {},
    durationMs: 100,
  });
  vi.mocked(generateSegmentsModule).mockResolvedValue({
    segmentStatements: [],
    customerProblems: [],
    repairCount: 0,
    usage: {},
    durationMs: 100,
  });
  vi.mocked(generateResourcesModule).mockResolvedValue({
    statements: [],
    repairCount: 0,
    usage: {},
    durationMs: 100,
  });
  vi.mocked(generateCompetitorsBatch).mockResolvedValue({
    profileStatements: [],
    landscapeStatements: [],
    repairCount: 0,
    usage: {},
    durationMs: 100,
  });
  vi.mocked(generateSynthesis).mockResolvedValue({
    swotStatements: [],
    marketPathStatements: [],
    repairCount: 0,
    usage: {},
    durationMs: 100,
  });
}

describe("runPhase1Analysis integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.phase1Run.findFirst).mockResolvedValue(null);
    mockModuleDefaults();
    phase1Config.monolithicFallback = true;
    phase1Config.modularGeneration = true;
    phase1Config.moduleCache = true;
    vi.mocked(runMonolithicPhase1).mockResolvedValue({
      statements: [],
      pestelRelevance: [],
      incremental: false,
      filteredDuplicateCount: 0,
    });
  });

  it("1: all modules successful", async () => {
    const events: Phase1StreamEvent[] = [];
    await runPhase1Analysis({
      projectId: "proj-test",
      emit: (e) => events.push(e),
    });
    expect(generateAnchor).toHaveBeenCalled();
    expect(generateSynthesis).toHaveBeenCalled();
    expect(events.some((e) => e.type === "final")).toBe(true);
  });

  it("18: anchor failure triggers fallback", async () => {
    vi.mocked(generateAnchor).mockRejectedValue(new Error("anchor fail"));
    await runPhase1Analysis({ projectId: "proj-test" });
    expect(runMonolithicPhase1).toHaveBeenCalled();
  });

  it("marks the run failed when monolithic fallback also fails", async () => {
    vi.mocked(generateAnchor).mockRejectedValue(new Error("anchor fail"));
    vi.mocked(runMonolithicPhase1).mockRejectedValue(
      new Error("fallback invalid")
    );

    await expect(runPhase1Analysis({ projectId: "proj-test" })).rejects.toThrow(
      "fallback invalid"
    );

    expect(prisma.phase1Run.update).toHaveBeenCalledWith({
      where: { runId: expect.any(String) },
      data: expect.objectContaining({ status: "FAILED" }),
    });
  });

  it("20: fallback disabled throws", async () => {
    phase1Config.monolithicFallback = false;
    vi.mocked(generatePestelModule).mockRejectedValue(
      Object.assign(new Error("pestel fail"), { name: "Phase1ModuleError" })
    );
    await expect(
      runPhase1Analysis({ projectId: "proj-test" })
    ).rejects.toThrow();
    expect(runMonolithicPhase1).not.toHaveBeenCalled();
  });

  it("27: parallel run conflict", async () => {
    vi.mocked(prisma.phase1Run.findFirst).mockResolvedValue({
      runId: "other-run",
      status: "RUNNING",
    } as never);
    await expect(
      runPhase1Analysis({ projectId: "proj-test" })
    ).rejects.toBeInstanceOf(Phase1RunConflictError);
  });

  it("29: abort during core modules", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      runPhase1Analysis({
        projectId: "proj-test",
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("17: consistency ERROR triggers monolithic fallback", async () => {
    vi.mocked(checkPhase1Consistency).mockResolvedValue({
      isConsistent: false,
      issues: [
        {
          severity: "ERROR",
          module: "pestel",
          objectId: "s1",
          issueType: "CONTRADICTION",
          explanation: "conflict",
          repairInstruction: "fix",
        },
      ],
    });
    const events: Phase1StreamEvent[] = [];
    await runPhase1Analysis({
      projectId: "proj-test",
      emit: (e) => events.push(e),
    });
    expect(runMonolithicPhase1).toHaveBeenCalled();
    expect(events.some((e) => e.type === "final")).toBe(false);
    expect(events.some((e) => e.type === "warning" && e.message.includes("Fallback"))).toBe(true);
  });

  it("consistency ERROR without fallback fails without persist", async () => {
    phase1Config.monolithicFallback = false;
    vi.mocked(checkPhase1Consistency).mockResolvedValue({
      isConsistent: false,
      issues: [
        {
          severity: "ERROR",
          module: "pestel",
          issueType: "CONTRADICTION",
          explanation: "conflict",
        },
      ],
    });
    const events: Phase1StreamEvent[] = [];
    await expect(
      runPhase1Analysis({
        projectId: "proj-test",
        emit: (e) => events.push(e),
      })
    ).rejects.toBeInstanceOf(Phase1ConsistencyError);
    expect(runMonolithicPhase1).not.toHaveBeenCalled();
    expect(events.some((e) => e.type === "error")).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("consistency WARNING only persists normally", async () => {
    vi.mocked(checkPhase1Consistency).mockResolvedValue({
      isConsistent: false,
      issues: [
        {
          severity: "WARNING",
          module: "pestel",
          issueType: "MILD",
          explanation: "minor",
        },
      ],
    });
    const events: Phase1StreamEvent[] = [];
    await runPhase1Analysis({
      projectId: "proj-test",
      emit: (e) => events.push(e),
    });
    expect(runMonolithicPhase1).not.toHaveBeenCalled();
    expect(events.some((e) => e.type === "final")).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
