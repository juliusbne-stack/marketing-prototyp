import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Der Projektname darf nicht leer sein."),
});

// Start-up profile fields (phase 1 inputs, see prisma/schema.prisma).
const profileFieldSchema = z.object({
  businessIdea: z.string().trim().min(1, "Die Geschäftsidee ist Pflicht.").optional(),
  productStatus: z.string().trim().nullable().optional(),
  assumedTarget: z.string().trim().nullable().optional(),
  assumedProblem: z.string().trim().nullable().optional(),
  valuePropDraft: z.string().trim().nullable().optional(),
  revenueIdea: z.string().trim().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  teamSize: z.number().int().min(1).nullable().optional(),
  budgetMonthly: z.string().trim().nullable().optional(),
  timePerWeek: z.string().trim().nullable().optional(),
  skills: z.string().trim().nullable().optional(),
  existingInsights: z.string().trim().nullable().optional(),
  profileOnboardingStep: z.number().int().min(0).max(12).optional(),
  profileOnboardingComplete: z.boolean().optional(),
});

const updateProfileSchema = z
  .object({
    id: z.string().min(1),
  })
  .merge(profileFieldSchema)
  .refine(
    (data) => {
      const { id: _id, ...fields } = data;
      return Object.values(fields).some((value) => value !== undefined);
    },
    { message: "Mindestens ein Feld zum Aktualisieren angeben." }
  );

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, currentPhase: true, createdAt: true },
  });
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bitte einen Projektnamen angeben." },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: { name: parsed.data.name },
  });

  return NextResponse.json(project, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Das Profil konnte nicht gespeichert werden. Die Geschäftsidee ist Pflicht." },
      { status: 400 }
    );
  }

  const { id, ...profile } = parsed.data;

  // Only persist fields present in the request; empty strings become null.
  const data = Object.fromEntries(
    Object.entries(profile)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, value === "" ? null : value])
  );

  try {
    const project = await prisma.project.update({ where: { id }, data });
    return NextResponse.json(project);
  } catch {
    return NextResponse.json(
      { error: "Das Projekt wurde nicht gefunden." },
      { status: 404 }
    );
  }
}
