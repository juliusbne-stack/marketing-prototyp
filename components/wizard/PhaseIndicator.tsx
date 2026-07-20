"use client";

import { useParams, usePathname } from "next/navigation";

export function PhaseIndicator() {
  const params = useParams<{ n: string }>();
  const pathname = usePathname();
  const isCockpit = pathname?.endsWith("/cockpit") ?? false;
  const phase = Number(params.n) || 1;

  return (
    <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-deep">
      {isCockpit ? "Umsetzungs-Cockpit" : `Phase ${phase}/5`}
    </span>
  );
}
