import { PHASE1_SHARED_RULES } from "./shared";

export const PHASE1_RESOURCES_PROMPT = `${PHASE1_SHARED_RULES}

AUFGABE — RESSOURCEN-MODUL:
Erzeuge 2–4 RESOURCE-Aussagen zur internen Ausgangslage.

Bezug auf Teamgröße, Budget, Zeit, Fähigkeiten, Produktstatus aus dem Profil.
Meist origin USER_INPUT oder AI_DERIVATION aus Profilangaben.
Keine externen Marktfaktoren (PESTEL) und keine Wettbewerbsaussagen.`;
