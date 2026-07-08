import type { EvidenceStatus } from "@prisma/client";

// Group heading above the anchor statement (Phase 4 open validation).
export function getAnchorAssumptionGroupHeading(
  evidenceStatus: EvidenceStatus
): string {
  switch (evidenceStatus) {
    case "FACT":
      return "Gestützte Kernannahme — Beobachtung im größeren Maßstab";
    case "OPEN_QUESTION":
      return "Offene Frage in Prüfung";
    case "ASSUMPTION":
    default:
      return "Kritische Annahme";
  }
}

// Secondary line under the group heading; only FACT carries extra context.
export function getAnchorAssumptionGroupSubtitle(
  evidenceStatus: EvidenceStatus
): string | null {
  if (evidenceStatus !== "FACT") return null;
  return "Diese Annahme wurde in bisherigen Runden gestützt. Die folgenden Schritte weiten die Umsetzung aus und prüfen, ob sie auch im größeren Maßstab trägt.";
}

// Inline prefix before the assumption text (cockpit, phase 5 feedback).
export function getAnchorAssumptionInlinePrefix(
  evidenceStatus: EvidenceStatus
): string {
  switch (evidenceStatus) {
    case "FACT":
      return "Gestützte Kernannahme";
    case "OPEN_QUESTION":
      return "Offene Frage in Prüfung";
    case "ASSUMPTION":
    default:
      return "Kritische Annahme";
  }
}
