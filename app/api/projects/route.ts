import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Der Projektname darf nicht leer sein."),
});

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
