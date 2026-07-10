import { PHASE1_SHARED_RULES } from "./shared";

export const PHASE1_SEGMENTS_PROMPT = `${PHASE1_SHARED_RULES}

AUFGABE — ZIELGRUPPEN-MODUL:
Erzeuge 2–3 Segmentprofile und 2–4 CUSTOMER_PROBLEM-Aussagen.

Je Segment:
- segmentLabel, overallDescription, defaultSourceRef (optional)
- GENAU 5 Statements mit segmentAspect: DESCRIPTION, PROBLEM_NEED, BEHAVIOR_CONTEXT, WILLINGNESS_TO_PAY, REACHABILITY
- category TARGET_SEGMENT für Segment-Statements
- category CUSTOMER_PROBLEM für übergreifende Problem-Aussagen (ohne segmentLabel)

Evidenz ehrlich differenzieren — WILLINGNESS_TO_PAY oft OPEN_QUESTION.
Wenn keine Zielgruppe im Profil: aus Geschäftsidee, Problem und Nutzen ableiten.
Keine Wettbewerber, kein PESTEL, kein SWOT in diesem Modul.`;
