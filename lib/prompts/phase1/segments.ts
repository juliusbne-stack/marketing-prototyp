import { PHASE1_SHARED_RULES } from "./shared";

export const PHASE1_SEGMENTS_PROMPT = `${PHASE1_SHARED_RULES}

AUFGABE - ZIELGRUPPEN-MODUL:
Erzeuge 2-3 Segmentprofile und 2-4 CUSTOMER_PROBLEM-Aussagen.

Je Segment:
- segmentLabel, overallDescription, defaultSourceRef (optional)
- 6 bis 7 Statements mit segmentAspect:
  WHO_CORE, WHO_DISTINGUISHERS, optional WHO_BOUNDARY_ROLE,
  PROBLEM_NEED, BEHAVIOR_CONTEXT, WILLINGNESS_TO_PAY, REACHABILITY
- category TARGET_SEGMENT fuer Segment-Statements
- category CUSTOMER_PROBLEM fuer uebergreifende Problem-Aussagen (ohne segmentLabel)

Segmentprofil/Wer:
- WHO_CORE beschreibt nur Segmentkern: Lebensphase, Rolle, Unternehmensart,
  Kundensituation und Region, sofern begruendet.
- WHO_DISTINGUISHERS nennt strategisch relevante Merkmale, die das Segment von
  benachbarten Segmenten unterscheiden. Keine Kanalnutzung, keine blosse
  Preis- oder Problemaussage.
- WHO_BOUNDARY_ROLE ist optional und nur zu erzeugen, wenn Ausschluss,
  Nutzer-/Kaeufer-/Entscheiderrolle oder angrenzende Gruppen relevant sind.
Jedes Wer-Teilstatement hat eigenen Evidenzstatus und bleibt kurz.

Abgrenzung zu anderen Segmentbereichen:
- Problem & Bedarf enthaelt Aufgaben, Frustrationen, Problemintensitaet und
  Ersatzloesungen.
- Verhalten & Kontext enthaelt bisheriges Verhalten, Nutzungssituation,
  Ausloeser und Gewohnheiten.
- Zahlungsbereitschaft enthaelt Preisbereich, Budgetlogik, Preissensibilitaet
  und Kaufhuerden.
- Erreichbarkeit enthaelt Kontaktpunkte, Kanalnutzung, Communities,
  Plattformen und Zugangsvoraussetzungen.

Evidenz ehrlich differenzieren - WILLINGNESS_TO_PAY oft OPEN_QUESTION.
Wenn keine Zielgruppe im Profil: aus Geschaeftsidee, Problem und Nutzen ableiten.
Keine Persona, kein Name, kein Foto, keine Scheingenauigkeit.
Keine Wettbewerber, kein PESTEL, kein SWOT in diesem Modul.`;
