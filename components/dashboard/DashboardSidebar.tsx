"use client";

import {
  BarChart3,
  ChevronLeft,
  CircleHelp,
  FolderOpen,
  LayoutGrid,
  Menu,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MProtoBrand } from "./MProtoBrand";
import { usePrototypeNotice } from "./PrototypeNoticeProvider";

function NavItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  if (active) {
    return (
      <div
        aria-current="page"
        className="flex items-center gap-3 rounded-xl bg-accent-soft px-3 py-2.5 text-sm font-medium text-accent"
      >
        <span className="h-5 w-0.5 shrink-0 rounded-full bg-accent" aria-hidden />
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {label}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-black/[0.03] hover:text-text"
    >
      <span className="w-0.5 shrink-0" aria-hidden />
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { showNotice } = usePrototypeNotice();

  function handleDummy() {
    showNotice();
    onNavigate?.();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pb-5 pt-4 lg:px-3.5">
        <MProtoBrand />
      </div>

      <nav className="flex flex-col gap-1 px-3" aria-label="Hauptnavigation">
        <NavItem icon={FolderOpen} label="Projekte" active />
        <NavItem icon={LayoutGrid} label="Vorlagen" onClick={handleDummy} />
        <NavItem icon={BarChart3} label="Insights" onClick={handleDummy} />
        <NavItem icon={Settings} label="Einstellungen" onClick={handleDummy} />
      </nav>

      <div className="mt-auto px-3 pb-3 pt-6">
        <div className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
          <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden />
          </div>
          <p className="font-heading text-sm font-semibold text-text">
            Strategisch besser entscheiden.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Strukturiert. Evidenzbasiert. Zukunftsorientiert.
          </p>
          <button
            type="button"
            onClick={handleDummy}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent transition-colors hover:brightness-90"
          >
            Mehr erfahren
            <span aria-hidden>→</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleDummy}
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-xs font-medium text-text-muted transition-colors hover:text-text"
        >
          <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
          Hilfe &amp; Feedback
        </button>

        <div className="mt-1 flex justify-end px-1">
          <span
            className="inline-flex rounded-lg p-1.5 text-text-muted"
            aria-hidden="true"
            title="Sidebar einklappen (nur visuell)"
          >
            <ChevronLeft className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop / tablet sidebar */}
      <aside className="sticky top-0 hidden h-[calc(100vh-2.5rem)] w-[220px] shrink-0 border-r border-border bg-surface md:block lg:w-[240px]">
        <SidebarContent />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <MProtoBrand compact />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Navigation öffnen"
          className="rounded-lg p-2 text-text-muted transition-colors hover:bg-accent-soft hover:text-accent"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Navigation schließen"
            className="absolute inset-0 bg-text/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(100%,280px)] flex-col bg-surface shadow-xl">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Navigation schließen"
                className="rounded-lg p-2 text-text-muted hover:bg-accent-soft hover:text-accent"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
