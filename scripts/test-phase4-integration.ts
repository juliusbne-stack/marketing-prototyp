/**
 * DB-backed Phase 4 checks. Run: npx tsx scripts/test-phase4-integration.ts
 */
import { prisma } from "../lib/prisma";
import {
  buildCandidateWhitelist,
  getValidatedChannels,
} from "../lib/phase4/guards";
import { getPhase4Mode } from "../lib/phase4/mode";

async function main() {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    take: 10,
  });
  console.log(`Projekte gefunden: ${projects.length}`);

  for (const project of projects) {
    const mode = await getPhase4Mode(project.id);
    const validationWhitelist = await buildCandidateWhitelist(
      project.id,
      "VALIDATION"
    );
    const scalingWhitelist = await buildCandidateWhitelist(
      project.id,
      "SCALING"
    );
    const channels = await getValidatedChannels(project.id);

    const latest = await prisma.adaptationDecision.findFirst({
      where: { projectId: project.id, userConfirmed: true },
      orderBy: { createdAt: "desc" },
      select: { decision: true },
    });

    console.log(`\n--- ${project.name} (${project.id}) ---`);
    console.log(`  Phase5-Entscheidung: ${latest?.decision ?? "keine"}`);
    console.log(`  getPhase4Mode: ${mode}`);
    console.log(
      `  VALIDATION-Whitelist: ${validationWhitelist.length} (${validationWhitelist.map((c) => c.evidenceStatus).join(", ")})`
    );
    console.log(`  SCALING-Whitelist: ${scalingWhitelist.length}`);
    console.log(`  validierte Kanäle: [${channels.join(", ")}]`);

    // T1: FACTs should not be in validation whitelist
    const factsInValidation = validationWhitelist.filter(
      (c) => c.evidenceStatus === "FACT"
    );
    if (factsInValidation.length > 0) {
      console.log(`  WARN T1: ${factsInValidation.length} FACT in VALIDATION-Whitelist`);
    } else if (validationWhitelist.length > 0) {
      console.log("  OK T1: keine FACTs in VALIDATION-Whitelist");
    }

    // T12: scaling whitelist should only be FACT
    const nonFactsInScaling = scalingWhitelist.filter(
      (c) => c.evidenceStatus !== "FACT"
    );
    if (nonFactsInScaling.length > 0) {
      console.log(`  WARN T12: Nicht-FACT in SCALING-Whitelist`);
    } else if (scalingWhitelist.length > 0) {
      console.log("  OK T12: SCALING-Whitelist nur FACT");
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
