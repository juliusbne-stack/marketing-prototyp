import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PrototypeNoticeStrip } from "@/components/dashboard/PrototypeBanner";
import { PhaseStepper } from "@/components/wizard/PhaseStepper";
import { PhaseIndicator } from "@/components/wizard/PhaseIndicator";

function isValidationStepDetailPath(pathname: string): boolean {
  return /\/project\/[^/]+\/phase\/4\/step\/[^/]+$/.test(pathname);
}

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pathname = (await headers()).get("x-pathname") ?? "";
  const stepDetailView = isValidationStepDetailPath(pathname);

  const project = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, currentPhase: true },
  });

  if (!project) {
    notFound();
  }

  if (stepDetailView) {
    return (
      <div className="validation-step-detail-shell flex flex-1 flex-col">
        <PrototypeNoticeStrip />
        {children}
      </div>
    );
  }

  const adoptedStepCount = await prisma.validationStep.count({
    where: { projectId: id, adopted: true },
  });

  return (
    <div className="flex flex-1 flex-col">
      <PrototypeNoticeStrip />
      <header className="sticky top-0 z-40 bg-background/85 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center gap-4 rounded-2xl border border-border/70 bg-surface px-5 py-3 shadow-[0_14px_36px_rgba(31,36,33,0.08)]">
          <Link
            href="/"
            aria-label="Zur Projektübersicht"
            className="text-text-muted transition-colors hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <h1 className="flex-1 font-heading text-lg font-bold text-text">
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
