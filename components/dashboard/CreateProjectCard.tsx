"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CirclePlus } from "lucide-react";
import { NewProjectForm } from "@/components/NewProjectForm";

export function CreateProjectCard() {
  const [isFocused, setIsFocused] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isFocused) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        dismissFocus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFocused]);

  function focusProjectNameInput() {
    document.getElementById("new-project-name")?.focus();
  }

  function dismissFocus() {
    const input = document.getElementById("new-project-name");
    if (input === document.activeElement) {
      input.blur();
    }
    setIsFocused(false);
  }

  return (
    <>
      {mounted &&
        isFocused &&
        createPortal(
          <button
            type="button"
            aria-label="Fokus beenden"
            className="fixed inset-0 z-40 bg-text/20 backdrop-blur-[1px] transition-opacity duration-200"
            onClick={dismissFocus}
          />,
          document.body
        )}

      <div className={`relative mt-4 ${isFocused ? "z-50" : "z-10"}`}>
        <section
          className={`rounded-3xl border border-border bg-surface px-5 py-4 sm:px-6 sm:py-5 ${
            isFocused
              ? "shadow-md ring-1 ring-accent-border/70"
              : "shadow-sm"
          }`}
          onFocusCapture={() => setIsFocused(true)}
          onBlurCapture={(event) => {
            const next = event.relatedTarget as Node | null;
            if (!event.currentTarget.contains(next)) {
              setIsFocused(false);
            }
          }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8 lg:gap-10">
            <div className="flex min-w-0 items-center gap-3.5 md:max-w-[280px] md:shrink-0 lg:max-w-xs">
              <button
                type="button"
                onClick={focusProjectNameInput}
                aria-label="Zum Projektnamen springen"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-muted transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
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
      </div>
    </>
  );
}
