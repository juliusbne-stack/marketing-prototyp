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

type OptionWithStatements = Prisma.StrategyOptionGetPayload<{
  include: typeof optionInclude;
}>;

function toOptionData(option: OptionWithStatements) {
  return {
    id: option.id,
    title: option.title,
    summary: option.summary,
    status: option.status,
    prioritizationRationale: option.prioritizationRationale,
    statements: option.statements.map((link) => link.statement),
  };
}

const updateSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).optional(),
    summary: z.string().trim().min(1).optional(),
    // Adopts the whole hypothesis bundle: option + all dimension statements.
    adopt: z.literal(true).optional(),
  })
  .refine((data) => Object.keys(data).length > 1, "Keine Änderung angegeben.");

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Änderung konnte nicht verarbeitet werden." },
      { status: 400 }
    );
  }

  const { id, adopt, ...data } = parsed.data;

  try {
    const option = await prisma.$transaction(async (tx) => {
      const updated = await tx.strategyOption.update({
        where: { id },
        data: {
          ...data,
          // Adoption only moves DRAFT → ADOPTED; prioritized options keep their status.
          ...(adopt ? { status: "ADOPTED" as const } : {}),
        },
        include: optionInclude,
      });
      if (adopt) {
        await tx.statement.updateMany({
          where: {
            id: { in: updated.statements.map((link) => link.statementId) },
          },
          data: { adopted: true },
        });
        return tx.strategyOption.findUniqueOrThrow({
          where: { id },
          include: optionInclude,
        });
      }
      return updated;
    });
    return NextResponse.json(toOptionData(option));
  } catch {
    return NextResponse.json(
      { error: "Die Option wurde nicht gefunden." },
      { status: 404 }
    );
  }
}

const prioritizeSchema = z.object({
  projectId: z.string().min(1),
  optionId: z.string().min(1),
  rationale: z.string().trim().min(1),
});

// The prioritization decision is made by the USER (F7/NF3): the chosen option
// becomes PRIORITIZED with the confirmed rationale, all other adopted options
// are deferred (DEFERRED) and stay available.
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = prioritizeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Für die Priorisierung fehlt die Begründung." },
      { status: 400 }
    );
  }

  const { projectId, optionId, rationale } = parsed.data;

  const option = await prisma.strategyOption.findFirst({
    where: { id: optionId, projectId, status: { not: "DRAFT" } },
  });

  if (!option) {
    return NextResponse.json(
      { error: "Nur übernommene Optionen können priorisiert werden." },
      { status: 400 }
    );
  }

  const options = await prisma.$transaction(async (tx) => {
    await tx.strategyOption.updateMany({
      where: {
        projectId,
        id: { not: optionId },
        status: { in: ["ADOPTED", "PRIORITIZED", "DEFERRED"] },
      },
      data: { status: "DEFERRED" },
    });
    await tx.strategyOption.update({
      where: { id: optionId },
      data: { status: "PRIORITIZED", prioritizationRationale: rationale },
    });
    return tx.strategyOption.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      include: optionInclude,
    });
  });

  return NextResponse.json({ options: options.map(toOptionData) });
}
