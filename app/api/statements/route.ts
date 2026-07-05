import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma, EvidenceStatus, Origin, StatementCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
} satisfies Prisma.StatementSelect;

const createStatementSchema = z.object({
  projectId: z.string().min(1),
  phase: z.number().int().min(1).max(5),
  category: z.enum(StatementCategory).optional(),
  content: z.string().trim().min(1),
  evidenceStatus: z.enum(EvidenceStatus),
  origin: z.enum(Origin),
  justification: z.string().trim().optional(),
  sourceRef: z.string().trim().optional(),
  uncertainty: z.string().trim().optional(),
});

const updateStatementSchema = z
  .object({
    id: z.string().min(1),
    content: z.string().trim().min(1).optional(),
    evidenceStatus: z.enum(EvidenceStatus).optional(),
    origin: z.enum(Origin).optional(),
    category: z.enum(StatementCategory).optional(),
    justification: z.string().trim().nullable().optional(),
    sourceRef: z.string().trim().nullable().optional(),
    uncertainty: z.string().trim().nullable().optional(),
    adopted: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 1,
    "Keine Änderung angegeben."
  );

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const phaseParam = searchParams.get("phase");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  const statements = await prisma.statement.findMany({
    where: {
      projectId,
      ...(phaseParam ? { phase: Number(phaseParam) } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: statementSelect,
  });

  return NextResponse.json(statements);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createStatementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Aussage ist unvollständig. Inhalt, Evidenzstatus und Herkunft sind Pflichtfelder." },
      { status: 400 }
    );
  }

  const { justification, sourceRef, uncertainty, ...rest } = parsed.data;

  const statement = await prisma.statement.create({
    data: {
      ...rest,
      justification: justification || null,
      sourceRef: sourceRef || null,
      uncertainty: uncertainty || null,
      // Adoption happens only through an explicit user action (F10/NF5).
      adopted: false,
    },
    select: statementSelect,
  });

  return NextResponse.json(statement, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateStatementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Änderung konnte nicht verarbeitet werden." },
      { status: 400 }
    );
  }

  const { id, ...data } = parsed.data;

  try {
    const statement = await prisma.statement.update({
      where: { id },
      data,
      select: statementSelect,
    });
    return NextResponse.json(statement);
  } catch {
    return NextResponse.json(
      { error: "Die Aussage wurde nicht gefunden." },
      { status: 404 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id fehlt in der Anfrage." },
      { status: 400 }
    );
  }

  try {
    await prisma.statement.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Die Aussage wurde nicht gefunden." },
      { status: 404 }
    );
  }
}
