import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const projects = await prisma.project.findMany({
  select: {
    id: true,
    name: true,
    currentPhase: true,
    _count: {
      select: {
        statements: { where: { phase: 1, adopted: true } },
        options: { where: { status: "PRIORITIZED" } },
      },
    },
  },
  take: 5,
  orderBy: { updatedAt: "desc" },
});
console.log(JSON.stringify(projects, null, 2));
await prisma.$disconnect();
