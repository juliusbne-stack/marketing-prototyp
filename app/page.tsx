import Link from "next/link";
import { FolderOpen, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { NewProjectForm } from "@/components/NewProjectForm";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

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
              <li key={project.id}>
                <Link
                  href={`/project/${project.id}/phase/1`}
                  className="group flex items-center gap-3 rounded-[10px] border border-border bg-surface p-4 transition-colors hover:border-accent"
                >
                  <FolderOpen
                    className="h-5 w-5 shrink-0 text-accent"
                    aria-hidden
                  />
                  <div className="flex-1">
                    <div className="font-heading text-base font-medium text-text">
                      {project.name}
                    </div>
                    <div className="text-xs text-text-muted">
                      Phase {project.currentPhase} von 5 · angelegt am{" "}
                      {dateFormatter.format(project.createdAt)}
                    </div>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 text-text-muted transition-colors group-hover:text-accent"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
