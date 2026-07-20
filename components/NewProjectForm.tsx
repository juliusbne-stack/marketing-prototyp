"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";

export function NewProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.error ??
            "Das Projekt konnte nicht angelegt werden. Erneut versuchen — deine Eingabe bleibt erhalten."
        );
      }

      const project: { id: string } = await response.json();
      router.push(`/project/${project.id}/phase/1`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das Projekt konnte nicht angelegt werden. Erneut versuchen — deine Eingabe bleibt erhalten."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2 rounded-2xl border border-accent-border bg-surface p-1.5 shadow-[0_0_0_3px_rgba(191,227,216,0.35)] focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(15,140,116,0.18)] sm:gap-0">
        <input
          id="new-project-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name des Start-up-Projekts, z. B. „Yoga-Studio Köln“"
          aria-label="Projektname"
          className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-text shadow-none outline-none! ring-0 placeholder:text-text-muted focus:border-0 focus:ring-0 disabled:opacity-60 sm:px-3.5"
          disabled={isSubmitting}
        />
        <span
          className="mx-1 hidden h-7 w-px shrink-0 bg-border sm:block"
          aria-hidden
        />
        <ProgressButton
          type="submit"
          loading={isSubmitting}
          loadingPhase="save"
          disabled={!name.trim()}
          loadingLabel="Wird angelegt …"
          className="h-10 shrink-0 rounded-xl px-4 shadow-none"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Projekt anlegen
        </ProgressButton>
      </div>
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </form>
  );
}
