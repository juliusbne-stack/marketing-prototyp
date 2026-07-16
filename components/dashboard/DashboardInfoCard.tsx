import { Sparkles } from "lucide-react";

export function DashboardInfoCard() {
  return (
    <aside className="mt-10 rounded-2xl border border-border bg-accent-soft/40 px-5 py-4">
      <div className="flex items-start gap-3 sm:items-center sm:justify-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft">
          <Sparkles className="h-4 w-4 text-accent" aria-hidden />
        </div>
        <div className="text-sm leading-relaxed text-text-muted sm:text-center">
          <p>
            Gute Strategien entstehen nicht durch Zufall – sondern durch
            strukturierte Fragen.
          </p>
          <p className="mt-0.5">Wir begleiten dich durch alle fünf Phasen.</p>
        </div>
      </div>
    </aside>
  );
}
