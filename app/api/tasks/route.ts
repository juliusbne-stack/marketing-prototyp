import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { taskSelect } from "@/lib/tasks";

const updateTaskSchema = z.object({
  id: z.string().min(1),
  done: z.boolean(),
});

// Toggles a single cockpit task — checkbox changes persist immediately.
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Die Änderung konnte nicht verarbeitet werden." },
      { status: 400 }
    );
  }

  try {
    const task = await prisma.task.update({
      where: { id: parsed.data.id },
      data: { done: parsed.data.done },
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
