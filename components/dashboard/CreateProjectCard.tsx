"use client";

import { CirclePlus } from "lucide-react";
import { NewProjectForm } from "@/components/NewProjectForm";

export function CreateProjectCard() {
  function focusProjectNameInput() {
    document.getElementById("new-project-name")?.focus();
  }

  return (
    <section className="relative z-10 mb-8 rounded-3xl border border-border bg-surface px-5 py-4 shadow-sm sm:px-6 sm:py-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8 lg:gap-10">
        <div className="flex min-w-0 items-center gap-3.5 md:max-w-[280px] md:shrink-0 lg:max-w-xs">
          <button
            type="button"
            onClick={focusProjectNameInput}
            aria-label="Zum Projektnamen springen"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-[#7A8B93] transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <CirclePlus className="h-6 w-6" strokeWidth={1.5} aria-hidden />
          </button>
          <div className="min-w-0">
            <h2 className="font-heading text-base font-semibold leading-snug text-text">
              Neues Projekt erstellen
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-text-muted sm:text-sm">
              Starte ein neues Strategieprojekt in fünf klaren Phasen.
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <NewProjectForm />
        </div>
      </div>
    </section>
  );
}
