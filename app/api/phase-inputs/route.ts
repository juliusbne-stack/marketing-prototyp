import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { phaseInputUpsertSchema } from "@/lib/schemas/phaseInput";
import { loadPhaseInputsForPage } from "@/lib/phaseInput/context";
import { stateToUpsertPayload } from "@/lib/phaseInput/values";
import type { PhaseInputPhase, PhaseInputState } from "@/lib/phaseInput/types";

const getQuerySchema = z.object({
  projectId: z.string().min(1),
  phase: z.coerce.number().pipe(z.union([z.literal(2), z.literal(4)])),
});

function toJsonValue(
  value: unknown,
  skipped: boolean
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (skipped || value == null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = getQuerySchema.safeParse({
    projectId: searchParams.get("projectId"),
    phase: searchParams.get("phase"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "projectId und phase (2 oder 4) sind erforderlich." },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: parsed.data.projectId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  const state = await loadPhaseInputsForPage(
    parsed.data.projectId,
    parsed.data.phase
  );
  return NextResponse.json(state);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = phaseInputUpsertSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Phasen-Eingaben." },
      { status: 400 }
    );
  }

  const { projectId, phase, entries, onboarding } = parsed.data;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden." },
      { status: 404 }
    );
  }

  await prisma.$transaction(
    entries
      .filter((entry) => entry.questionKey !== "_onboarding")
      .map((entry) =>
      prisma.phaseInput.upsert({
        where: {
          projectId_phase_questionKey: {
            projectId,
            phase,
            questionKey: entry.questionKey,
          },
        },
        create: {
          projectId,
          phase,
          questionKey: entry.questionKey,
          value: toJsonValue(entry.value, entry.skipped),
          skipped: entry.skipped,
        },
        update: {
          value: toJsonValue(entry.value, entry.skipped),
          skipped: entry.skipped,
        },
      })
    )
  );

  if (onboarding) {
    await prisma.phaseInput.upsert({
      where: {
        projectId_phase_questionKey: {
          projectId,
          phase,
          questionKey: "_onboarding",
        },
      },
      create: {
        projectId,
        phase,
        questionKey: "_onboarding",
        value: onboarding as Prisma.InputJsonValue,
        skipped: false,
      },
      update: {
        value: onboarding as Prisma.InputJsonValue,
        skipped: false,
      },
    });
  }

  const state = await loadPhaseInputsForPage(projectId, phase);
  return NextResponse.json(state);
}

/** Convenience for wizard saves from the client. */
export function buildPatchBody(
  projectId: string,
  phase: PhaseInputPhase,
  state: PhaseInputState
) {
  return {
    projectId,
    phase,
    entries: stateToUpsertPayload(projectId, phase, state).map((entry) => ({
      questionKey: entry.questionKey,
      value: entry.value,
      skipped: entry.skipped,
    })),
    onboarding: state.onboarding,
  };
}
