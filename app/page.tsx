import { prisma } from "@/lib/prisma";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardInfoCard } from "@/components/dashboard/DashboardInfoCard";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ProjectGrid } from "@/components/dashboard/ProjectGrid";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, currentPhase: true, createdAt: true },
  });

  const projectCards = projects.map((project) => ({
    id: project.id,
    name: project.name,
    currentPhase: project.currentPhase,
    createdAt: project.createdAt.toISOString(),
  }));

  return (
    <DashboardShell>
      <DashboardHero />
      <ProjectGrid projects={projectCards} />
      <DashboardInfoCard />
    </DashboardShell>
  );
}
