"use client";

import { useMemo, useState } from "react";
import { FolderPlus } from "lucide-react";
import { ProjectCard, type ProjectCardData } from "./ProjectCard";
import { ProjectToolbar } from "./ProjectToolbar";

export function ProjectGrid({ projects }: { projects: ProjectCardData[] }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) =>
      project.name.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  return (
    <section>
      <ProjectToolbar
        projectCount={projects.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
            <FolderPlus className="h-6 w-6 text-accent" aria-hidden />
          </div>
          <p className="font-heading text-base font-semibold text-text">
            Noch keine Projekte vorhanden
          </p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
            Lege dein erstes Strategieprojekt an und starte mit der
            Situationsanalyse.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-text-muted">
          Keine passenden Projekte gefunden.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => (
            <li key={project.id} className="min-w-0">
              <ProjectCard {...project} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
