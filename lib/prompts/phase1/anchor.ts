import { PHASE1_SHARED_RULES } from "./shared";

export const PHASE1_ANCHOR_PROMPT = `${PHASE1_SHARED_RULES}

AUFGABE — ANALYSEANKER (kein Statement-Output):
Erstelle einen kompakten, verbindlichen Analyseanker für alle Folgemodule.
Der Analyseanker ist ein internes Hilfsobjekt — keine fertige Strategie, keine Statements.

Der Analyseanker MUSS:
- Marktdefinition und geografische Abgrenzung festlegen
- Geschäftskern, Nutzer-/Käufer-/Zahlerrollen unterscheiden
- Kundenproblem und Nutzenversprechen abgrenzen
- Produkt-/Unternehmensstatus und Ressourcenrestriktionen erfassen
- relevante PESTEL-Dimensionen priorisieren (HIGH/MEDIUM/LOW)
- zentrale Analysefragen formulieren
- gemeinsame Begriffe und Definitionen festlegen
- kritische Unsicherheiten benennen
- einen Wettbewerberplan mit GENAU targetCompetitorCount Akteuren (6–9) erstellen
- jeden Kandidaten einem Batch 1, 2 oder 3 zuordnen (gleichmäßige Verteilung)
- Kohärenzregeln für Folgeprompts definieren

Wettbewerberplan:
- Mischung aus direkten/indirekten Wettbewerbern, Substituten, DIY, Offline, Plattform, Status quo
- Keine Dubletten zwischen Batches
- Jeder Kandidat: candidateId, name, competitorType, relevanceReason, batch

Nutze ventureAnchors und adoptedAnalysisStatements aus dem Kontext.
Keine Statements erzeugen — nur den Analyseanker als JSON.`;
