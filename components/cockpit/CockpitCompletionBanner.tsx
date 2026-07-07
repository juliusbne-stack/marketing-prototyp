"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { ProgressButton } from "@/components/ui/ProgressButton";

export function CockpitCompletionBanner({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoToPhase5() {
    setIsAdvancing(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/phase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: 5 }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "Der Phasenwechsel konnte nicht gespeichert werden. Erneut versuchen."
        );
      }
      router.push(`/project/${projectId}/phase/5`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Phasenwechsel konnte nicht gespeichert werden. Erneut versuchen."
      );
      setIsAdvancing(false);
    }
  }

  return (
    <div
      role="status"
      className="rounded-[10px] border-2 border-accent bg-accent-soft p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text">
          Umsetzungsperiode abgeschlossen — alle Rückmeldungen liegen vor. Werte
          sie jetzt aus und triff die Anpassungsentscheidung.
        </p>
        <ProgressButton
          type="button"
          onClick={handleGoToPhase5}
          loading={isAdvancing}
          loadingPhase="save"
          loadingLabel="Wechsel läuft …"
          className="shrink-0"
        >
          Rückmeldungen auswerten
          <ArrowRight className="h-4 w-4" aria-hidden />
        </ProgressButton>
      </div>
      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}
    </div>
  );
}
