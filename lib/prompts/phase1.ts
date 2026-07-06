// Phase 1 prompt — hypothesis-oriented situation analysis (docs/PROMPTS.md).
export const PHASE1_PROMPT = `AUFGABE: Erstelle aus dem Start-up-Profil ein evidenzbewertetes Analysebild.
Simuliere dafür eine Recherche zu Markt, Kunden, Wettbewerb und Umfeld (fiktive
Quellen, siehe Simulationsmodus).

Erzeuge Aussagen in diesen Bereichen:
1. PESTEL: je Kategorie (POLITICAL, ECONOMIC, SOCIAL, TECHNOLOGICAL, ECOLOGICAL,
   LEGAL) 1–3 relevante Aussagen. Nur was für dieses Geschäftsmodell wirklich
   relevant ist — Kategorien dürfen auch nur 1 Aussage haben.
2. TARGET_SEGMENT: 2–4 Zielgruppenhypothesen. Wenn der Nutzer keine Zielgruppe
   angegeben hat, leite sie aus Geschäftsidee, Problem und Nutzenversprechen ab —
   dann als ASSUMPTION, nie als FACT.
3. CUSTOMER_PROBLEM: 2–4 Aussagen zu Kundenproblemen und deren Relevanz.
4. COMPETITOR: 3–5 fiktive Wettbewerber/Alternativen/Ersatzlösungen (auch
   Nicht-Nutzung oder manuelle Lösungen zählen als Alternative).
5. RESOURCE: 2–4 Aussagen zu internen Ressourcen/Fähigkeiten (aus dem Profil,
   meist FACT mit origin USER_INPUT).
6. SWOT: je Quadrant (STRENGTH, WEAKNESS, OPPORTUNITY, THREAT) 2–3 Aussagen,
   die die vorherigen Bereiche verdichten.
7. MARKET_PATH: 2–3 erkennbare Marktpfade als Aussagen (welche grundsätzlichen
   Wege der Marktbearbeitung sich abzeichnen) — immer ASSUMPTION.

Achte auf eine ehrliche Mischung: Es MUSS auch OPEN_QUESTIONs geben (typisch:
Zahlungsbereitschaft, tatsächliche Problemrelevanz, Kanalwirksamkeit).

AUSGABEFORMAT (JSON, exakt dieses Schema):
{
  "statements": [
    {
      "category": "PESTEL_POLITICAL | PESTEL_ECONOMIC | PESTEL_SOCIAL | PESTEL_TECHNOLOGICAL | PESTEL_ECOLOGICAL | PESTEL_LEGAL | TARGET_SEGMENT | CUSTOMER_PROBLEM | COMPETITOR | RESOURCE | SWOT_STRENGTH | SWOT_WEAKNESS | SWOT_OPPORTUNITY | SWOT_THREAT | MARKET_PATH",
      "content": "string",
      "evidenceStatus": "FACT | ASSUMPTION | OPEN_QUESTION",
      "origin": "USER_INPUT | SIMULATED_RESEARCH | AI_DERIVATION",
      "justification": "string",
      "sourceRef": "string | null  (Pflicht bei SIMULATED_RESEARCH, endet mit '(fiktiv)')",
      "uncertainty": "string | null"
    }
  ]
}`;
