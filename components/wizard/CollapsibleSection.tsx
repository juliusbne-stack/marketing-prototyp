"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { ChevronDown } from "lucide-react";

export const ANALYSIS_SECTION_OPEN_EVENT = "analysis-section-open";

/** Open a CollapsibleSection by id (used by Phase-1 section nav). */
export function requestOpenAnalysisSection(id: string) {
  window.dispatchEvent(
    new CustomEvent(ANALYSIS_SECTION_OPEN_EVENT, { detail: { id } })
  );
}

/** Run a state update and pin the window scroll position exactly. */
function withFrozenScroll(update: () => void) {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  flushSync(update);

  const restore = () => {
    if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
      window.scrollTo(scrollX, scrollY);
    }
  };

  restore();
  // Scroll anchoring / layout can nudge after paint — pin again.
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
}

export function CollapsibleSection({
  title,
  intro,
  defaultOpen = false,
  highlightUntilOpened = false,
  id,
  className,
  actions,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  defaultOpen?: boolean;
  /** Soft green border pulse until the section is opened once. */
  highlightUntilOpened?: boolean;
  id?: string;
  className?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultOpen);

  const showHighlight = highlightUntilOpened && !hasBeenOpened;

  useEffect(() => {
    if (!id) return;

    function handleOpenRequest(event: Event) {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id !== id) return;

      flushSync(() => {
        setHasBeenOpened(true);
        setIsOpen(true);
      });
    }

    window.addEventListener(ANALYSIS_SECTION_OPEN_EVENT, handleOpenRequest);
    return () => {
      window.removeEventListener(ANALYSIS_SECTION_OPEN_EVENT, handleOpenRequest);
    };
  }, [id]);

  function handleToggle() {
    withFrozenScroll(() => {
      if (isOpen) {
        setIsOpen(false);
        return;
      }
      setHasBeenOpened(true);
      setIsOpen(true);
    });
  }

  return (
    <section
      id={id}
      className={`rounded-[10px] border bg-surface [overflow-anchor:none] ${
        showHighlight
          ? "analysis-section-pulse border-evidence-fact-border"
          : "border-border"
      } ${className ?? ""}`}
    >
      <div className="flex items-center">
        <button
          type="button"
          onMouseDown={(event) => {
            // Avoid focus-driven scroll-into-view on click.
            event.preventDefault();
          }}
          onClick={handleToggle}
          aria-expanded={isOpen}
          className={`group flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 ease-out hover:bg-accent-soft/45 ${
            isOpen ? "rounded-t-[10px]" : "rounded-[10px]"
          }`}
        >
          <span className="font-heading text-base font-medium text-text transition-colors duration-200 group-hover:text-accent">
            {title}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-text-muted transition-[transform,color] duration-200 ease-out group-hover:text-accent motion-reduce:transition-none ${
              isOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
        {actions && (
          <div
            className="shrink-0 pr-4"
            onClick={(event) => event.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </div>
      {isOpen && (
        <div className="border-t border-border px-4 pb-4 pt-3 [overflow-anchor:none]">
          {intro && (
            <div className="mb-4 text-sm text-text-muted">{intro}</div>
          )}
          {children}
        </div>
      )}
    </section>
  );
}
