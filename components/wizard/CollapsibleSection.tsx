"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function CollapsibleSection({
  title,
  intro,
  defaultOpen = false,
  children,
}: {
  title: string;
  intro?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-[10px] border border-border bg-surface">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-background"
      >
        <span className="font-heading text-base font-medium text-text">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      {isOpen && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {intro && <p className="mb-4 text-sm text-text-muted">{intro}</p>}
          {children}
        </div>
      )}
    </section>
  );
}
