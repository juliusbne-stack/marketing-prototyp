import { prisma } from "@/lib/prisma";
import type { Phase4Mode } from "./types";

export type { Phase4Mode } from "./types";

/**
 * Single source of truth for Phase 4 mode.
 * CONTINUE → SCALING; all other confirmed decisions (or none) → VALIDATION.
 */
export async function getPhase4Mode(projectId: string): Promise<Phase4Mode> {
  const latestAdaptation = await prisma.adaptationDecision.findFirst({
    where: { projectId, userConfirmed: true },
    orderBy: { createdAt: "desc" },
    select: { decision: true },
  });

  if (latestAdaptation?.decision === "CONTINUE") {
    return "SCALING";
  }
  return "VALIDATION";
}
