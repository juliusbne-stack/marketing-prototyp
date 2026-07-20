"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Folder,
  MoreHorizontal,
  Star,
  Trash2,
} from "lucide-react";
import { useConfirm } from "@/components/ui/DialogProvider";
import { usePrototypeNotice } from "./PrototypeNoticeProvider";
import { getPhaseBadgeStyle, getProjectAccent } from "./projectCardStyles";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export type ProjectCardData = {
  id: string;
  name: string;
  currentPhase: number;
  createdAt: string | Date;
};

export function ProjectCard({
  id,
  name,
  currentPhase,
  createdAt,
}: ProjectCardData) {
  const router = useRouter();
  const confirm = useConfirm();
  const { showNotice } = usePrototypeNotice();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accent = getProjectAccent(id);
  const phaseStyle = getPhaseBadgeStyle(currentPhase);
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  const created =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const href = `/project/${id}/phase/${currentPhase}`;

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
    <article
      className={`relative h-full transition-[transform,box-shadow] hover:-translate-y-0.5 ${
        isBusy ? "opacity-60" : ""
      }`}
    >
      <Link
        href={href}
        className="flex h-full flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm outline-offset-4 transition-[border-color,box-shadow] hover:border-accent-border hover:shadow-md"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.iconBg}`}
            aria-hidden
          >
            <Folder
              className={`h-7 w-7 ${accent.iconColor}`}
              strokeWidth={1.5}
            />
            <span
              className={`absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 font-heading text-[11px] font-bold leading-none ${accent.iconColor}`}
            >
              {initial}
            </span>
          </div>
          {/* spacer for absolute star button */}
          <span className="h-8 w-8 shrink-0" aria-hidden />
        </div>

        <h3 className="font-heading text-[15px] font-semibold leading-snug text-text [overflow-wrap:anywhere]">
          {name}
        </h3>
        <span
          className={`mt-2 inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${phaseStyle.badgeBg} ${phaseStyle.badgeText}`}
        >
          Phase {currentPhase} von 5
        </span>
        {error ? (
          <p className="mt-2 text-xs text-danger-text">{error}</p>
        ) : null}

        {/* pt-3 keeps a fixed gap above the rule even when mt-auto has no free space */}
        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-3">
            <div className="flex min-w-0 items-center gap-1.5 text-xs text-text-muted">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                Angelegt am {dateFormatter.format(created)}
              </span>
            </div>
            <span className="h-8 w-8 shrink-0" aria-hidden />
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          showNotice("Im Prototyp nicht umgesetzt.");
        }}
        aria-label="Projekt als Favorit markieren – im Prototyp nicht umgesetzt"
        className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-black/[0.04] hover:text-accent"
      >
        <Star className="h-4 w-4" aria-hidden />
      </button>

      <div ref={menuRef} className="absolute bottom-3 right-3 z-10">
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setMenuOpen((value) => !value);
          }}
          disabled={isBusy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Weitere Projektaktionen für „${name}"`}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-black/[0.04] hover:text-accent disabled:opacity-50"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>
        {menuOpen ? (
          <ul
            role="menu"
            className="absolute bottom-full right-0 z-20 mb-1 w-44 rounded-xl border border-border bg-surface py-1 shadow-md"
          >
            <li role="none">
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs text-danger-text hover:bg-danger-bg"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Projekt löschen
              </button>
            </li>
          </ul>
        ) : null}
      </div>
    </article>
  );
}
