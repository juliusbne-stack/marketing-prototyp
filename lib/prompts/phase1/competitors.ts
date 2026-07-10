import { PHASE1_SHARED_RULES } from "./shared";

export function buildCompetitorsBatchPrompt(batch: 1 | 2 | 3): string {
  return `${PHASE1_SHARED_RULES}

AUFGABE — WETTBEWERBER-BATCH ${batch}:
Erzeuge Profile NUR für die im competitorPlan mit batch=${batch} festgelegten Kandidaten.
Du darfst KEINE anderen Akteure auswählen oder ersetzen.

Pro Kandidat:
- candidateId, name, competitorType aus dem Plan übernehmen
- overallDescription auf Profilebene
- GENAU 6 Statements mit competitorAspect: ENTITY_TYPE, OFFERING, TARGET_CUSTOMERS, PRICING, SCALE, RELEVANCE
- category COMPETITOR

COMPETITOR-Evidenzregeln (differenziert):
- ENTITY_TYPE/OFFERING/PRICING: FACT erlaubt bei simulierter Recherche (sourceRef endet mit „(fiktiv)")
- TARGET_CUSTOMERS/SCALE: meist ASSUMPTION
- RELEVANCE: immer ASSUMPTION oder AI_DERIVATION — nie FACT

Wenn ein Kandidat logisch unbrauchbar ist: replacementRequests zurückgeben, keinen stillen Austausch.

Zusätzlich 0–1 Landschafts-Aussagen (COMPETITOR ohne competitorLabel) nur wenn Batch 1 und noch nicht abgedeckt.
Kein SWOT, kein PESTEL in diesem Modul.`;
}
