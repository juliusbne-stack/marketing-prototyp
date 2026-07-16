"use client";

import {
  Filter,
  LayoutGrid,
  List,
  Search,
} from "lucide-react";
import { usePrototypeNotice } from "./PrototypeNoticeProvider";

export function ProjectToolbar({
  projectCount,
  searchQuery,
  onSearchChange,
}: {
  projectCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) {
  const { showNotice } = usePrototypeNotice();

  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-base font-semibold text-text">
          Deine Projekte
        </h2>
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-black/[0.06] px-2 py-0.5 text-xs font-medium text-text-muted">
          {projectCount}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="relative block min-w-0 flex-1 sm:min-w-[200px] sm:flex-none">
          <span className="sr-only">Projekte durchsuchen</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Projekte durchsuchen …"
            className="h-9 w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-muted focus:border-accent"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => showNotice()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm text-text-muted transition-colors hover:border-accent/40 hover:text-text"
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filter
          </button>

          <button
            type="button"
            onClick={() => showNotice()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-sm text-text-muted transition-colors hover:border-accent/40 hover:text-text"
          >
            Sortieren: Neueste
          </button>

          <div
            className="inline-flex h-9 items-center rounded-xl border border-border bg-surface p-0.5"
            role="group"
            aria-label="Ansicht umschalten"
          >
            <button
              type="button"
              aria-pressed="true"
              aria-label="Rasteransicht"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent-soft text-accent"
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-pressed="false"
              aria-label="Listenansicht – im Prototyp nicht umgesetzt"
              onClick={() => showNotice()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-text-muted transition-colors hover:text-text"
            >
              <List className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
