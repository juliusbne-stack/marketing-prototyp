import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const supersedeRequestSchema = z.object({
  content: z
    .string()
    .trim()
    .min(20, "Die präzisierte Aussage muss mindestens 20 Zeichen haben."),
  evidenceStatus: z.enum(["FACT", "ASSUMPTION"]),
});

const statementSelect = {
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
  supersededByStatementId: true,
} satisfies Prisma.StatementSelect;

const SUPERSEDE_JUSTIFICATION =
  "Vom Nutzer in Phase 5 präzisierte Erkenntnis; löst eine frühere Aussage ab.";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = supersedeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Die präzisierte Aussage ist unvollständig. Inhalt (mind. 20 Zeichen) und Evidenzstatus sind Pflichtfelder.",
      },
      { status: 400 }
    );
  }

  const original = await prisma.statement.findUnique({
    where: { id },
    include: {
      optionLinks: {
        include: {
          option: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!original) {
    return NextResponse.json(
      { error: "Die Aussage wurde nicht gefunden." },
      { status: 404 }
    );
  }

  if (!original.adopted) {
    return NextResponse.json(
      {
        error:
          "Nur übernommene Aussagen können präzisiert werden. Übernimm die Aussage zuerst in den Projektstand.",
      },
      { status: 400 }
    );
  }

  if (original.supersededByStatementId !== null) {
    return NextResponse.json(
      {
        error:
          "Diese Aussage wurde bereits durch eine präzisierte Erkenntnis abgelöst.",
      },
      { status: 400 }
    );
  }

  const prioritizedLinks = original.optionLinks.filter(
    (link) => link.option.status === "PRIORITIZED"
  );

  if (prioritizedLinks.length === 0) {
    return NextResponse.json(
      {
        error:
          "Diese Aussage ist keiner priorisierten Strategieoption zugeordnet und kann nicht als Dimensions-Präzisierung übernommen werden.",
      },
      { status: 400 }
    );
  }

  const { content, evidenceStatus } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const replacement = await tx.statement.create({
        data: {
          projectId: original.projectId,
          phase: 5,
          category: original.category,
          content,
          evidenceStatus,
          origin: "USER_INPUT",
          // Nutzer ist Autor — das HITL-Gate schützt vor KI-Entwürfen, nicht vor bewussten Nutzerentscheidungen.
          adopted: true,
          justification: SUPERSEDE_JUSTIFICATION,
          segmentLabel: original.segmentLabel,
          segmentAspect: original.segmentAspect,
          competitorLabel: original.competitorLabel,
          competitorAspect: original.competitorAspect,
        },
        select: statementSelect,
      });

      // OptionStatement uses a composite PK (optionId, statementId) — relink via delete/create.
      for (const link of prioritizedLinks) {
        await tx.optionStatement.delete({
          where: {
            optionId_statementId: {
              optionId: link.optionId,
              statementId: original.id,
            },
          },
        });
        await tx.optionStatement.create({
          data: {
            optionId: link.optionId,
            statementId: replacement.id,
          },
        });
      }

      const superseded = await tx.statement.update({
        where: { id: original.id },
        data: { supersededByStatementId: replacement.id },
        select: statementSelect,
      });

      return { replacement, superseded };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Statement supersede failed:", error);
    return NextResponse.json(
      {
        error:
          "Die Präzisierung konnte nicht gespeichert werden. Erneut versuchen.",
      },
      { status: 500 }
    );
  }
}
