import { prisma } from "@/lib/prisma";
import type { WhitelistCandidate } from "./guards";

export async function loadStartupProfile(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) return null;
  return {
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
  };
}

export async function loadAdoptedAnalysis(projectId: string) {
  return prisma.statement.findMany({
    where: { projectId, phase: 1, adopted: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      content: true,
      evidenceStatus: true,
      origin: true,
      justification: true,
      sourceRef: true,
      uncertainty: true,
      segmentLabel: true,
      segmentAspect: true,
    },
  });
}

export function buildAddressedSegmentProfile(
  adoptedAnalysis: Awaited<ReturnType<typeof loadAdoptedAnalysis>>,
  segmentLabel: string | null
) {
  if (!segmentLabel) return null;
  return {
    segmentLabel,
    aspects: adoptedAnalysis
      .filter(
        (statement) =>
          statement.category === "TARGET_SEGMENT" &&
          statement.segmentLabel === segmentLabel
      )
      .map((statement) => ({
        statementId: statement.id,
        segmentAspect: statement.segmentAspect,
        content: statement.content,
        evidenceStatus: statement.evidenceStatus,
        uncertainty: statement.uncertainty,
      })),
  };
}

export function whitelistToContext(whitelist: WhitelistCandidate[]) {
  return whitelist.map((candidate) => ({
    id: candidate.id,
    text: candidate.content,
    justification: candidate.justification,
    uncertainty: candidate.uncertainty,
    evidenceStatus: candidate.evidenceStatus,
    strategyDimension: candidate.strategyDimension,
    allowedDecisiveTestSubjects: candidate.allowedDecisiveTestSubjects,
  }));
}

export async function loadScalingTestedWith(projectId: string) {
  const option = await prisma.strategyOption.findFirst({
    where: { projectId, status: "PRIORITIZED" },
    select: { id: true },
  });
  if (!option) return new Map<string, unknown[]>();

  const adoptedSteps = await prisma.validationStep.findMany({
    where: { optionId: option.id, adopted: true, discardedAt: null },
    orderBy: { createdAt: "asc" },
    include: {
      metrics: {
        select: { name: true, successCriterion: true, failureCriterion: true },
      },
    },
  });

  const feedbacks = await prisma.marketFeedback.findMany({
    where: { stepId: { in: adoptedSteps.map((step) => step.id) } },
    orderBy: { createdAt: "asc" },
    select: {
      stepId: true,
      statementId: true,
      result: true,
      interpretation: true,
    },
  });

  const byAssumption = new Map<string, unknown[]>();
  for (const step of adoptedSteps) {
    const entry = {
      title: step.title,
      validationQuestion: step.validationQuestion,
      testDesign: step.testDesign,
      marketingActivities: step.marketingActivities,
      channel: step.channel,
      metrics: step.metrics,
      feedbackResults: feedbacks
        .filter((feedback) => feedback.stepId === step.id)
        .map((feedback) => ({
          result: feedback.result,
          interpretation: feedback.interpretation,
        })),
    };
    const list = byAssumption.get(step.assumptionId) ?? [];
    list.push(entry);
    byAssumption.set(step.assumptionId, list);
  }
  return byAssumption;
}
