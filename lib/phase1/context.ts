import { prisma } from "@/lib/prisma";
import {
  countAdoptedCompetitorLabels,
  pickRandomTargetCompetitorCount,
  requiredNewCompetitorProfiles,
} from "@/lib/competitorCount";
import {
  buildVentureAnchors,
  filterAdoptedAnchorsForPestel,
} from "@/lib/ventureAnchors";
import { createRunId } from "./hashing";
import { createPhase1ModuleHashes } from "./dependencies";
import type { AdoptedContextStatement, Phase1Context } from "./types";

export { createPhase1ModuleHashes };

const adoptedContextSelect = {
  category: true,
  content: true,
  evidenceStatus: true,
  origin: true,
  justification: true,
  sourceRef: true,
  uncertainty: true,
  segmentLabel: true,
  segmentAspect: true,
  competitorLabel: true,
  competitorAspect: true,
} as const;

export async function loadPhase1Context(
  projectId: string,
  runId = createRunId()
): Promise<Phase1Context> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  });

  const adoptedAnalysis = (await prisma.statement.findMany({
    where: { projectId, phase: 1, adopted: true },
    orderBy: { createdAt: "asc" },
    select: adoptedContextSelect,
  })) as AdoptedContextStatement[];

  const isIncremental = adoptedAnalysis.length > 0;
  const targetCompetitorCount = pickRandomTargetCompetitorCount();
  const adoptedCompetitorLabelCount =
    countAdoptedCompetitorLabels(adoptedAnalysis);
  const requiredNewProfiles = requiredNewCompetitorProfiles(
    targetCompetitorCount,
    adoptedCompetitorLabelCount
  );

  return {
    projectId,
    runId,
    isIncremental,
    targetCompetitorCount,
    adoptedCompetitorLabelCount,
    requiredNewProfiles,
    ventureAnchors: buildVentureAnchors(project),
    adoptedAnchorsForPestel: filterAdoptedAnchorsForPestel(
      isIncremental ? adoptedAnalysis : []
    ) as AdoptedContextStatement[],
    adoptedAnalysis,
    startupProfile: {
      businessIdea: project.businessIdea,
      productStatus: project.productStatus,
      assumedTarget: project.assumedTarget,
      assumedProblem: project.assumedProblem,
      valueProposition: project.valuePropDraft,
      revenueIdea: project.revenueIdea,
      region: project.region,
      teamSize: project.teamSize,
      budgetMonthly: project.budgetMonthly,
      timePerWeek: project.timePerWeek,
      skillsAndChannels: project.skills,
      existingCustomerInsights: project.existingInsights,
    },
  };
}

export function assertOnlyAdoptedStatementsUsedAsExistingContext(
  context: Phase1Context
): void {
  for (const statement of context.adoptedAnalysis) {
    if (!statement.content?.trim()) {
      throw new Error("Ungültiger adopted-Kontext.");
    }
  }
}
