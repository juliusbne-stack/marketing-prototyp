import { prisma } from "../lib/prisma";
import { buildCandidateWhitelist } from "../lib/phase4/guards";
import { getPhase4Mode } from "../lib/phase4/mode";

async function main() {
  console.log("=== Whitelist strategyDimension distribution (VALIDATION) ===\n");
  for (const p of await prisma.project.findMany({ select: { id: true, name: true } })) {
    const mode = await getPhase4Mode(p.id);
    if (mode !== "VALIDATION") continue;
    const wl = await buildCandidateWhitelist(p.id, "VALIDATION");
    if (wl.length === 0) continue;
    const dims = wl.map((c) => c.strategyDimension ?? "null");
    const unique = new Set(dims);
    console.log(`${p.name}: whitelist=${wl.length}, unique dims=${unique.size} [${[...unique].join(", ")}]`);
  }

  console.log("\n=== MarketFeedback on non-adopted steps ===\n");
  const feedbackOnDraft = await prisma.marketFeedback.count({
    where: {
      step: { adopted: false },
    },
  });
  const feedbackOnAdopted = await prisma.marketFeedback.count({
    where: {
      step: { adopted: true },
    },
  });
  const feedbackNoStep = await prisma.marketFeedback.count({
    where: { stepId: null },
  });
  console.log("Feedbacks linked to draft steps:", feedbackOnDraft);
  console.log("Feedbacks linked to adopted steps:", feedbackOnAdopted);
  console.log("Feedbacks with stepId null:", feedbackNoStep);

  await prisma.$disconnect();
}

main();
