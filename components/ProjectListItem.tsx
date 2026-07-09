"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FolderOpen, MoreVertical, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/DialogProvider";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ProjectListItem({
  id,
  name,
  currentPhase,
  createdAt,
}: {
  id: string;
  name: string;
  currentPhase: number;
  createdAt: Date;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleDelete() {
    setMenuOpen(false);

    const confirmed = await confirm({
      title: "Projekt löschen?",
      message: `"${name}" endgültig löschen? Alle Phasen, Aussagen und Strategieoptionen werden unwiderruflich entfernt.`,
      confirmLabel: "Löschen",
      cancelLabel: "Abbrechen",
      variant: "danger",
    });
    if (!confirmed) return;

    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          "Das Projekt konnte nicht gelöscht werden. Erneut versuchen."
        );
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das Projekt konnte nicht gelöscht werden. Erneut versuchen."
      );
      setIsBusy(false);
    }
  }

  return (
    <li>
      <div
        className={`group flex items-center gap-2 rounded-[10px] border border-border bg-surface p-4 transition-colors hover:border-accent ${
          isBusy ? "opacity-60" : ""
        }`}
      >
        <Link
          href={`/project/${id}/phase/1`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <FolderOpen
            className="h-5 w-5 shrink-0 text-accent"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="font-heading text-base font-medium text-text">
              {name}
            </div>
            <div className="text-xs text-text-muted">
              Phase {currentPhase} von 5 · angelegt am{" "}
              {dateFormatter.format(createdAt)}
            </div>
            {error && (
              <p className="mt-1 text-xs text-danger-text">{error}</p>
            )}
          </div>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-text-muted transition-colors group-hover:text-accent"
            aria-hidden
          />
        </Link>

        <div
          ref={menuRef}
          className={`relative shrink-0 transition-opacity ${
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          }`}
        >
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            disabled={isBusy}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Aktionen für „${name}"`}
            className="rounded p-1 text-text-muted transition-colors hover:text-accent disabled:opacity-50"
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </button>
          {menuOpen && (
            <ul
              role="menu"
              className="absolute right-0 top-full z-20 mt-1 w-40 rounded-md border border-border bg-surface py-1 shadow-sm"
            >
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs text-danger-text hover:bg-danger-bg"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Projekt löschen
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </li>
  );
}
