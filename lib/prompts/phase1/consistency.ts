import { PHASE1_SHARED_RULES } from "./shared";

export const PHASE1_CONSISTENCY_PROMPT = `${PHASE1_SHARED_RULES}

AUFGABE — KONSISTENZPRÜFUNG:
Prüfe das normalisierte Analysebild auf semantische Widersprüche zum Analyseanker.
Erzeuge KEINE neue Analyse — nur strukturierte Issues.

Prüfe u. a.:
- Widersprüche zur Marktdefinition und Geografie
- abweichende Zielgruppendefinitionen
- Wettbewerber außerhalb des Marktverständnisses
- SWOT ohne Grundlage
- Marktpfade ohne Bezug zu Kernmodulen
- Verwechslung intern/extern bei SWOT
- unbegründete FACT-Einstufungen
- semantische Dubletten ohne Mehrwert

severity ERROR nur bei blockierenden Fehlern; WARNING für Hinweise.`;

export const PHASE1_REPAIR_PROMPT = `${PHASE1_SHARED_RULES}

AUFGABE — GEZIELTE REPARATUR:
Korrigiere NUR die genannten fehlerhaften oder fehlenden Objekte.
Unveränderte gültige Teile dürfen nicht neu formuliert werden.
Antworte mit repairedObjects und/oder addedObjects.`;
