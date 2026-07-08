import { prisma } from "../lib/prisma";
import { buildCandidateWhitelist } from "../lib/phase4/guards";
import { getPhase4Mode } from "../lib/phase4/mode";

async function main() {
  const projects = await prisma.project.findMany({ select: { id: true, name: true } });
  for (const p of projects) {
    const mode = await getPhase4Mode(p.id);
    if (mode !== "VALIDATION") continue;
    const wl = await buildCandidateWhitelist(p.id, "VALIDATION");
    if (wl.length === 0) continue;
    const facts = await prisma.statement.findMany({
      where: { projectId: p.id, adopted: true, evidenceStatus: "FACT" },
      select: { id: true, phase: true },
    });
    const factInWl = facts.filter((f) => wl.some((w) => w.id === f.id));
    console.log(`D1 Fixture: ${p.name}`);
    console.log(`  Whitelist (${wl.length}): ${wl.map((w) => w.evidenceStatus).join(", ")}`);
    console.log(`  Adopted FACTs: ${facts.length}`);
    console.log(
      factInWl.length === 0
        ? "  PASS: kein FACT in Whitelist"
        : `  FAIL: ${factInWl.map((f) => f.id).join(", ")}`
    );
  }
  await prisma.$disconnect();
}
main();
