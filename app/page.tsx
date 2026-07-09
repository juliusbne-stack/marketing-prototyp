import { prisma } from "@/lib/prisma";
import { NewProjectForm } from "@/components/NewProjectForm";
import { ProjectListItem } from "@/components/ProjectListItem";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, currentPhase: true, createdAt: true },
  });

  return (
    <main className="mx-auto w-full max-w-[960px] px-6 py-12">
      <header className="mb-8">
        <h1 className="font-heading text-[22px] font-semibold text-text">
          Marketingstrategie-Prototyp
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Entwickle in fünf Phasen eine hypothesen- und evidenzbasierte
          Marketingstrategie für dein Start-up.
        </p>
      </header>

      <section className="mb-8 rounded-[10px] border border-border bg-surface p-4">
        <h2 className="mb-3 font-heading text-base font-medium text-text">
          Neues Projekt
        </h2>
        <NewProjectForm />
      </section>

      <section>
        <h2 className="mb-3 font-heading text-base font-medium text-text">
          Deine Projekte
        </h2>
        {projects.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
            Noch keine Projekte vorhanden. Lege oben dein erstes Projekt an —
            danach startet der fünfphasige Strategieprozess.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <ProjectListItem
                key={project.id}
                id={project.id}
                name={project.name}
                currentPhase={project.currentPhase}
                createdAt={project.createdAt}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
