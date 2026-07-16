import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEMO_FIXTURE } from "@/scripts/demo-fixture-data";
import { demoDelay } from "@/lib/demo/delay";

const optionInclude = {
  statements: {
    include: {
      statement: {
        select: {
          id: true,
          projectId: true,
          phase: true,
          category: true,
          content: true,
          evidenceStatus: true,
          origin: true,
          justification: true,
          sourceRef: true,
          uncertainty: true,
          isCritical: true,
          adopted: true,
          segmentLabel: true,
          segmentAspect: true,
          competitorLabel: true,
          competitorAspect: true,
        },
      },
    },
  },
} satisfies Prisma.StrategyOptionInclude;

export async function serveDemoPhase2(projectId: string) {
  await demoDelay(700);

  const optionEntries = Object.values(DEMO_FIXTURE.options);
  const statementsByKey = DEMO_FIXTURE.statements;

  const options = await prisma.$transaction(
    async (tx) => {
      const draftOptions = await tx.strategyOption.findMany({
        where: { projectId, status: "DRAFT" },
        select: { id: true, statements: { select: { statementId: true } } },
      });
      const draftStatementIds = draftOptions.flatMap((option) =>
        option.statements.map((link) => link.statementId)
      );
      if (draftOptions.length > 0) {
        await tx.strategyOption.deleteMany({
          where: { id: { in: draftOptions.map((option) => option.id) } },
        });
      }
      if (draftStatementIds.length > 0) {
        await tx.statement.deleteMany({
          where: { id: { in: draftStatementIds } },
        });
      }

      for (const option of optionEntries) {
        await tx.strategyOption.create({
          data: {
            projectId,
            title: option.title,
            summary: option.summary,
            status: "DRAFT",
            diversityNote: option.diversityNote ?? null,
            modeNote: option.modeNote ?? null,
            statements: {
              create: option.statementKeys.map((key) => {
                const dimension = statementsByKey[key];
                if (!dimension) {
                  throw new Error(
                    `Demo fixture missing option statement: ${key}`
                  );
                }
                return {
                  statement: {
                    create: {
                      projectId,
                      phase: 2,
                      category: dimension.category,
                      content: dimension.content,
                      evidenceStatus: dimension.evidenceStatus,
                      origin: dimension.origin,
                      justification: dimension.justification ?? null,
                      sourceRef: dimension.sourceRef ?? null,
                      uncertainty: dimension.uncertainty ?? null,
                      adopted: false,
                      segmentLabel:
                        dimension.category === "OPT_TARGET_GROUP"
                          ? (dimension.segmentLabel ?? null)
                          : null,
                      segmentAspect: dimension.segmentAspect ?? null,
                      competitorLabel: null,
                      competitorAspect: null,
                    },
                  },
                };
              }),
            },
          },
        });
      }

      return tx.strategyOption.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
        include: optionInclude,
      });
    },
    { maxWait: 15_000, timeout: 30_000 }
  );

  return {
    options: options.map((option) => ({
      id: option.id,
      title: option.title,
      summary: option.summary,
      status: option.status,
      prioritizationRationale: option.prioritizationRationale,
      statements: option.statements.map((link) => ({
        ...link.statement,
        competitorLabel: link.statement.competitorLabel ?? null,
        competitorAspect: link.statement.competitorAspect ?? null,
      })),
    })),
  };
}
