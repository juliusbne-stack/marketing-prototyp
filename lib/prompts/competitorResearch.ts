// Targeted fictional web research for one competitor profile (manual add flow).
export const COMPETITOR_RESEARCH_PROMPT = `AUFGABE: Führe eine simulierte, fiktive Websuche zu EINEM konkreten Akteur
durch und ergänze dessen Wettbewerbsprofil für die Situationsanalyse (Phase 1).

Der Nutzer hat den Akteursnamen (competitorLabel) angegeben. Recherchiere in diesem
Prototyp ausschließlich mit PLAUSIBLEN, FIKTIVEN Quellen — wie im Simulationsmodus.
Erfinde keine realen URLs oder reale Firmendaten; der Name kann vom Nutzer stammen,
die Recherche-Ergebnisse bleiben dennoch fiktiv simuliert.

KONTEXTNUTZUNG:
- startupProfile und adoptedAnalysisStatements (falls vorhanden) zeigen das Start-up.
- knownFields enthält bereits vom Nutzer eingegebene Profildimensionen — übernimm sie
  inhaltlich konsistent und ergänze nur die übrigen Dimensionen plausibel.
- competitorLabel ist der feste Profilname für alle sechs Aussagen.

AUSGABE — GENAU 6 Aussagen, je eine pro competitorAspect:
- ENTITY_TYPE: Art aus Kundensicht (direkter/indirekter Wettbewerber, Substitut, DIY,
  Offline-Alternative, Plattform, Status quo o. Ä.) — prüfbarer Satz.
- OFFERING: Was das Angebot aus Kundensicht leistet.
- TARGET_CUSTOMERS: Für wen primär gedacht.
- PRICING: Preismodell/Preisspanne — origin SIMULATED_RESEARCH mit sourceRef (fiktiv).
- SCALE: Größe/Reichweite — origin SIMULATED_RESEARCH mit sourceRef (fiktiv).
- RELEVANCE: Warum dieser Akteur für das Start-up relevant ist.

EVIDENZREGELN (wie Phase-1-Wettbewerb):
- ENTITY_TYPE / OFFERING: FACT erlaubt bei simuliert beobachtbaren Angaben.
- PRICING / SCALE: FACT nur bei konkreten simulierten Kennzahlen/Preisen; sonst ASSUMPTION.
- TARGET_CUSTOMERS: meist ASSUMPTION.
- RELEVANCE: nur ASSUMPTION oder AI_DERIVATION — nie FACT.
- FACT mit origin SIMULATED_RESEARCH erfordert sourceRef (endet mit „(fiktiv)").
- justification und uncertainty wie im GLOBAL_PROMPT.

JSON-SCHEMA:
{
  "statements": [
    {
      "competitorAspect": "ENTITY_TYPE | OFFERING | TARGET_CUSTOMERS | PRICING | SCALE | RELEVANCE",
      "content": "string",
      "evidenceStatus": "FACT | ASSUMPTION | OPEN_QUESTION",
      "origin": "SIMULATED_RESEARCH | AI_DERIVATION",
      "justification": "string",
      "sourceRef": "string | null",
      "uncertainty": "string | null"
    }
  ]
}

Pflicht: statements enthält GENAU 6 Einträge — jeder competitorAspect genau einmal.`;
