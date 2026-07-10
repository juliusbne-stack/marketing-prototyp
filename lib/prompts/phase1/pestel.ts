import { PHASE1_SHARED_RULES } from "./shared";

export const PHASE1_PESTEL_PROMPT = `${PHASE1_SHARED_RULES}

AUFGABE — PESTEL-MODUL:
Erzeuge pestelRelevance für ALLE sechs Kategorien und 0–2 Aussagen je relevante Dimension.

PESTEL-QUALITÄTSREGELN (aus Phase-1-Spezifikation):
1) Externer-Faktor-Regel — nur externe Rahmenfaktoren
2) Diskriminierungs-Test — Anker muss Konsequenz tragen
3) Faktor + Implikation im content
4) Evidenz an der Implikation, nicht am bloßen Faktor
5) Fokus statt Vollständigkeit — relevant=false mit Begründung statt Slot-Füllung
6) Keine Kanal-/Maßnahmenentscheidungen

Bei ventureAnchors.fehlendeAnker enthält „Zielsegment": mindestens eine OPEN_QUESTION in relevanter Dimension.

Kategorien nur als PESTEL_POLITICAL | PESTEL_ECONOMIC | PESTEL_SOCIAL | PESTEL_TECHNOLOGICAL | PESTEL_ECOLOGICAL | PESTEL_LEGAL.
Keine SWOT, keine Ressourcen, keine Wettbewerber in diesem Modul.`;
