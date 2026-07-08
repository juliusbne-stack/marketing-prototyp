import { prisma } from "../lib/prisma";
import { statementCategoryToStrategyDimension } from "../lib/phase4/strategyDimension";

async function main() {
  const options = await prisma.strategyOption.findMany({
    where: { status: "PRIORITIZED" },
    include: {
      statements: {
        include: {
          statement: {
            select: {
              id: true,
              category: true,
              adopted: true,
              evidenceStatus: true,
            },
          },
        },
      },
      project: { select: { name: true } },
    },
  });

  console.log("=== Prioritized option dimension statements ===\n");
  for (const opt of options) {
    const stmts = opt.statements.map((l) => l.statement).filter((s) => s.adopted);
    const dims = stmts.map((s) => ({
      cat: s.category,
      dim: statementCategoryToStrategyDimension(s.category),
      es: s.evidenceStatus,
    }));
    const uniqueDims = new Set(dims.map((d) => d.dim).filter(Boolean));
    const nullDim = dims.filter((d) => !d.dim).length;
    console.log(
      `${opt.project.name} | ${stmts.length} adopted dims | unique strategyDimension: ${uniqueDims.size} | null-mapped: ${nullDim}`
    );
    dims.forEach((d) => console.log(`  ${d.cat} → ${d.dim ?? "null"} (${d.es})`));
    console.log();
  }

  await prisma.$disconnect();
}

main();
