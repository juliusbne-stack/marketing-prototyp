/**
 * Targeted tests D1, T10, T6, T7 — run: npx tsx scripts/audit-phase4-tests.ts
 */
import { prisma } from "../lib/prisma";
import { buildCandidateWhitelist } from "../lib/phase4/guards";
import { getPhase4Mode } from "../lib/phase4/mode";

async function main() {
  console.log("=== D1: VALIDATION mode, FACT must not be in whitelist ===\n");
  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  for (const p of projects) {
    const mode = await getPhase4Mode(p.id);
    if (mode !== "VALIDATION") continue;

    const facts = await prisma.statement.findMany({
      where: {
        projectId: p.id,
        adopted: true,
        evidenceStatus: "FACT",
      },
      select: { id: true, content: true, phase: true },
      take: 3,
    });
    if (facts.length === 0) continue;

    const wl = await buildCandidateWhitelist(p.id, "VALIDATION");
    const factIdsInWl = facts.filter((f) => wl.some((c) => c.id === f.id));
    console.log(`Projekt: ${p.name} (${p.id})`);
    console.log(`  Modus: ${mode}`);
    console.log(`  FACT-Statements (adopted): ${facts.map((f) => `${f.id} (phase ${f.phase})`).join("; ")}`);
    console.log(`  VALIDATION-Whitelist-IDs: [${wl.map((c) => c.id).join(", ")}]`);
    console.log(
      factIdsInWl.length === 0
        ? "  ERGEBNIS D1: OK — kein FACT in Whitelist"
        : `  ERGEBNIS D1: FAIL — FACT(s) in Whitelist: ${factIdsInWl.map((f) => f.id).join(", ")}`
    );
    console.log();
  }

  console.log("=== T10: Phase-1 FACT as assumptionId but no SUPPORTED feedback on that statement ===\n");
  const adoptedSteps = await prisma.validationStep.findMany({
    where: { adopted: true, discardedAt: null },
    include: {
      assumption: { select: { id: true, phase: true, evidenceStatus: true, content: true } },
      option: { select: { projectId: true } },
    },
  });

  for (const step of adoptedSteps) {
    const a = step.assumption;
    if (a.phase !== 1 || a.evidenceStatus !== "FACT") continue;

    const feedbackOnAssumption = await prisma.marketFeedback.findFirst({
      where: {
        statementId: a.id,
        stepId: step.id,
        result: "SUPPORTED",
        interpretation: { not: null },
      },
    });

    const wl = await buildCandidateWhitelist(step.option.projectId, "SCALING");
    const inScalingWl = wl.some((c) => c.id === a.id);

    console.log(`Step ${step.id}, assumption ${a.id} (phase 1 FACT)`);
    console.log(`  SUPPORTED feedback on this statement: ${feedbackOnAssumption ? "ja" : "nein"}`);
    console.log(
      inScalingWl
        ? "  ERGEBNIS T10: FAIL — in SCALING-Whitelist"
        : "  ERGEBNIS T10: OK — nicht in SCALING-Whitelist"
    );
    console.log();
  }

  console.log("=== T7: CONTINUE projects — draft steps stepType ===\n");
  for (const p of projects) {
    const mode = await getPhase4Mode(p.id);
    if (mode !== "SCALING") continue;
    const option = await prisma.strategyOption.findFirst({
      where: { projectId: p.id, status: "PRIORITIZED" },
    });
    if (!option) continue;
    const drafts = await prisma.validationStep.findMany({
      where: { optionId: option.id, adopted: false, discardedAt: null },
      select: { id: true, stepType: true, title: true },
    });
    console.log(`Projekt: ${p.name}`);
  console.log(`  Draft-Schritte: ${drafts.length}`);
    drafts.forEach((s) => console.log(`    ${s.id}: stepType=${s.stepType} — ${s.title}`));
    if (drafts.length === 0) console.log("  (keine Entwürfe — T7 UI nur nach Skalierungs-Ableitung prüfbar)");
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
