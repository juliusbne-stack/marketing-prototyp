import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PhaseStepper } from "@/components/wizard/PhaseStepper";
import { PhaseIndicator } from "@/components/wizard/PhaseIndicator";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, adoptedStepCount] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      select: { id: true, name: true, currentPhase: true },
    }),
    // The implementation cockpit unlocks with the first adopted step.
    prisma.validationStep.count({ where: { projectId: id, adopted: true } }),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1240px] items-center gap-4 px-6 py-4">
          <Link
            href="/"
            aria-label="Zur Projektübersicht"
            className="text-text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <h1 className="flex-1 font-heading text-lg font-semibold text-text">
            {project.name}
          </h1>
          <PhaseIndicator />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-6 px-6 py-6 md:flex-row">
        <PhaseStepper
          projectId={project.id}
          currentPhase={project.currentPhase}
          cockpitUnlocked={adoptedStepCount > 0}
        />
        <main className="w-full max-w-[960px] flex-1">{children}</main>
      </div>
    </div>
  );
}
