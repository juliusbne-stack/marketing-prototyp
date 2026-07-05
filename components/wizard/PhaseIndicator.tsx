"use client";

import { useParams } from "next/navigation";

export function PhaseIndicator() {
  const params = useParams<{ n: string }>();
  const phase = Number(params.n) || 1;

  return (
    <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
      Phase {phase}/5
    </span>
  );
}
