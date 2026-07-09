import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { taskSelect } from "@/lib/tasks";

const updateTaskSchema = z
  .object({
    id: z.string().min(1),
    done: z.boolean().optional(),
    title: z.string().trim().min(1).optional(),
    erfolgskriterium: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (data) =>
      data.done !== undefined ||
      data.title !== undefined ||
      data.erfolgskriterium !== undefined,
    "Keine Änderung angegeben."
  );

// Toggles a cockpit task checkbox or updates task text from an adopted proposal.
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Änderung konnte nicht verarbeitet werden." },
      { status: 400 }
    );
  }

  const { id, done, title, erfolgskriterium } = parsed.data;

  try {
    if (done !== undefined) {
      const existing = await prisma.task.findUnique({
        where: { id },
        select: { herkunft: true },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Die Aufgabe wurde nicht gefunden." },
          { status: 404 }
        );
      }
      if (existing.herkunft === "BEREITS_ERFUELLT") {
        return NextResponse.json(
          { error: "Referenzierte Aufgaben können nicht abgehakt werden." },
          { status: 400 }
        );
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(done !== undefined ? { done } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(erfolgskriterium !== undefined ? { erfolgskriterium } : {}),
      },
      select: taskSelect,
    });
    return NextResponse.json(task);
  } catch {
    return NextResponse.json(
      { error: "Die Aufgabe wurde nicht gefunden." },
      { status: 404 }
    );
  }
}
