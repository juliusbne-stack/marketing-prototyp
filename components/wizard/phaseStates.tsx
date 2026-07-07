/**
 * Unified loading, empty and error states for all five phases (UI_KONZEPT §5, M6).
 */

export const AI_LOADING_MESSAGES: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "Die KI erstellt einen Analyse-Entwurf mit simulierten Recherchedaten …",
  2: "Die KI entwickelt aus deinem Analysebild 2–3 Strategieoptionen als Hypothesenbündel …",
  3: "Die KI vergleicht die Optionen anhand der sechs Kriterien …",
  4: "Die KI identifiziert die kritischsten Annahmen und leitet ressourcensensible Umsetzungsschritte mit Messpunkten ab …",
  5: "Die KI interpretiert die Rückmeldungen im Hinblick auf die geprüften Annahmen …",
};

export const AI_ERROR_FALLBACK =
  "Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Eingaben bleiben erhalten.";

export function PhaseErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-[10px] border border-danger-text/30 bg-danger-bg p-4 text-sm text-danger-text"
    >
      {message}
    </div>
  );
}

export function PhaseEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
      {children}
    </div>
  );
}

type SkeletonVariant = "card" | "option" | "matrix" | "step";

function SkeletonBlock({ variant }: { variant: SkeletonVariant }) {
  if (variant === "option") {
    return (
      <div className="h-72 animate-pulse rounded-[10px] border border-border bg-surface">
        <div className="m-4 h-3 w-2/3 rounded bg-border" />
        <div className="mx-4 h-3 w-full rounded bg-border/60" />
        <div className="m-4 h-20 rounded bg-border/40" />
      </div>
    );
  }

  if (variant === "matrix") {
    return (
      <div className="h-64 animate-pulse rounded-[10px] border border-border bg-surface">
        <div className="m-4 h-3 w-1/3 rounded bg-border" />
        <div className="mx-4 h-3 w-3/4 rounded bg-border/60" />
        <div className="m-4 h-40 rounded bg-border/40" />
      </div>
    );
  }

  if (variant === "step") {
    return (
      <div className="h-40 animate-pulse rounded-[10px] border border-border bg-surface">
        <div className="m-4 h-3 w-1/3 rounded bg-border" />
        <div className="mx-4 h-3 w-3/4 rounded bg-border/60" />
        <div className="m-4 h-16 rounded bg-border/40" />
      </div>
    );
  }

  return (
    <div className="h-24 animate-pulse rounded-[10px] border border-border bg-surface">
      <div className="m-4 h-3 w-1/4 rounded bg-border" />
      <div className="mx-4 h-3 w-3/4 rounded bg-border/60" />
    </div>
  );
}

export function PhaseLoadingState({
  phase,
  variant = "card",
  count,
  message,
}: {
  phase: 1 | 2 | 3 | 4 | 5;
  variant?: SkeletonVariant;
  count?: number;
  // Overrides the default phase message (e.g. scaling mode in phase 4).
  message?: string;
}) {
  const skeletonCount =
    count ??
    (variant === "option"
      ? 3
      : variant === "matrix"
        ? 1
        : variant === "step"
          ? 2
          : 4);

  const skeletons = Array.from({ length: skeletonCount }, (_, index) => (
    <SkeletonBlock key={index} variant={variant} />
  ));

  return (
    <div aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">
        {message ?? AI_LOADING_MESSAGES[phase]}
      </p>
      {variant === "option" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{skeletons}</div>
      ) : (
        skeletons
      )}
    </div>
  );
}
