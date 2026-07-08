import { prisma } from "../lib/prisma";
import { statementCategoryToStrategyDimension } from "../lib/phase4/strategyDimension";
import { buildCandidateWhitelist, getValidatedChannels } from "../lib/phase4/guards";
import { getPhase4Mode } from "../lib/phase4/mode";

async function main() {
  const adopted = await prisma.statement.findMany({
    where: { adopted: true },
    select: { id: true, category: true },
  });
  let mapped = 0;
  let unmapped = 0;
  const byCategory: Record<string, number> = {};
  for (const s of adopted) {
    const dim = statementCategoryToStrategyDimension(s.category);
    if (dim) mapped++;
    else {
      unmapped++;
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    }
  }
  console.log("Q2 adopted statements total:", adopted.length);
  console.log("Q2 with mappable strategyDimension:", mapped);
  console.log("Q2 with null strategyDimension (unmapped category):", unmapped);
  console.log("Q2 unmapped by category:", JSON.stringify(byCategory, null, 2));

  console.log("\nT7 CONTINUE projects:");
  for (const p of await prisma.project.findMany({
    select: { id: true, name: true },
  })) {
    const mode = await getPhase4Mode(p.id);
    if (mode !== "SCALING") continue;
    const wl = await buildCandidateWhitelist(p.id, "SCALING");
    const ch = await getValidatedChannels(p.id);
    const drafts = await prisma.validationStep.count({
      where: {
        projectId: p.id,
        adopted: false,
        discardedAt: null,
      },
    });
    console.log(
      `  ${p.name} (${p.id}) | scaling WL: ${wl.length} | channels: ${ch.length} | draft steps: ${drafts}`
    );
  }

  await prisma.$disconnect();
}

main();
