import { User, Search, Sparkles } from "lucide-react";
import type { Origin } from "@prisma/client";

const ORIGIN_CONFIG: Record<
  Origin,
  { label: string; Icon: typeof User }
> = {
  USER_INPUT: { label: "Nutzer", Icon: User },
  SIMULATED_RESEARCH: { label: "Recherche (fiktiv)", Icon: Search },
  AI_DERIVATION: { label: "KI-Ableitung", Icon: Sparkles },
};

export function OriginTag({ origin }: { origin: Origin }) {
  const { label, Icon } = ORIGIN_CONFIG[origin];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
