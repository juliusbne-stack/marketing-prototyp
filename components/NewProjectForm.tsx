"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name des Start-up-Projekts, z. B. „Yoga-Studio Köln“"
          aria-label="Projektname"
          className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !name.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {isSubmitting ? "Wird angelegt …" : "Projekt anlegen"}
        </button>
      </div>
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </form>
  );
}
