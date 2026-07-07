import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
        },
      },
    },
  },
} satisfies Prisma.StrategyOptionInclude;

const adoptRevisionSchema = z.object({
  optionId: z.string().min(1),
  oldStatementId: z.string().min(1),
  newStatementId: z.string().min(1),
});

// Adopts a revision proposal: the new statement becomes adopted and takes the
// old statement's place in the option bundle. The old statement is only
// UNLINKED, never deleted — ValidationSteps and MarketFeedback may still
// reference it, and deleting would cascade into phase 4/5 data.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = adoptRevisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Übernahme konnte nicht verarbeitet werden." },
      { status: 400 }
    );
  }

  const { optionId, oldStatementId, newStatementId } = parsed.data;

  const [oldLink, newStatement] = await Promise.all([
    prisma.optionStatement.findUnique({
      where: {
        optionId_statementId: { optionId, statementId: oldStatementId },
      },
      include: {
        option: { select: { projectId: true } },
        statement: { select: { category: true } },
      },
    }),
    prisma.statement.findUnique({
      where: { id: newStatementId },
      select: { id: true, projectId: true, category: true },
    }),
  ]);

  if (!oldLink || !newStatement) {
    return NextResponse.json(
      { error: "Die Option oder der Überarbeitungsvorschlag wurde nicht gefunden." },
      { status: 404 }
    );
  }

  if (
    newStatement.projectId !== oldLink.option.projectId ||
    newStatement.category !== oldLink.statement.category
  ) {
    return NextResponse.json(
      { error: "Der Vorschlag passt nicht zur ersetzten Dimension." },
      { status: 400 }
    );
  }

  const option = await prisma.$transaction(async (tx) => {
    await tx.statement.update({
      where: { id: newStatementId },
      data: { adopted: true },
    });
    await tx.optionStatement.delete({
      where: {
        optionId_statementId: { optionId, statementId: oldStatementId },
      },
    });
    await tx.optionStatement.create({
      data: { optionId, statementId: newStatementId },
    });
    return tx.strategyOption.findUniqueOrThrow({
      where: { id: optionId },
      include: optionInclude,
    });
  });

  return NextResponse.json({
    id: option.id,
    title: option.title,
    summary: option.summary,
    status: option.status,
    prioritizationRationale: option.prioritizationRationale,
    statements: option.statements.map((link) => link.statement),
  });
}
