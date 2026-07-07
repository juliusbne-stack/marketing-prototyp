// Phase 1 prompt — hypothesis-oriented situation analysis (docs/PROMPTS.md).
export const PHASE1_PROMPT = `AUFGABE: Erstelle aus dem Start-up-Profil ein evidenzbewertetes Analysebild.
Simuliere dafür eine Recherche zu Markt, Kunden, Wettbewerb und Umfeld (fiktive
Quellen, siehe Simulationsmodus).

Erzeuge Aussagen in diesen Bereichen:
1. PESTEL — RELEVANZENTSCHEIDUNG ZUERST:
   Beurteile für ALLE SECHS Kategorien (POLITICAL, ECONOMIC, SOCIAL,
   TECHNOLOGICAL, ECOLOGICAL, LEGAL) einzeln, ob sie für DIESES konkrete
   Geschäftsmodell strategisch relevant sind. Wende PESTEL nicht schematisch an,
   sondern kontextbezogen: Für viele Start-ups sind einzelne Dimensionen
   nachrangig.

   - Ist eine Kategorie relevant (relevant=true): erzeuge 1–3 Aussagen dazu
     im statements-Array (category = PESTEL_<KATEGORIE>).
   - Ist eine Kategorie nachrangig (relevant=false): erzeuge KEINE Aussage in
     dieser Kategorie. Begründe stattdessen in relevanceJustification in einem
     vollständigen, assertiven Satz, WARUM diese Dimension für dieses
     Geschäftsmodell aktuell nachrangig ist.
   - relevanceJustification ist für ALLE sechs Kategorien Pflicht — auch bei
     relevant=true (dann ein Satz dazu, warum die Dimension hier greift).
   - Sei ehrlich zurückhaltend: Markiere eine Kategorie nur dann als relevant,
     wenn sich daraus tatsächlich eine prägende Aussage ableiten lässt. Lieber
     wenige relevante Dimensionen als sechs erzwungene.
2. TARGET_SEGMENT: Entwickle 2–3 Zielgruppensegmente. Erzeuge je Segment GENAU 5
   Aussagen (category TARGET_SEGMENT), alle mit demselben segmentLabel und je einem
   segmentAspect: DESCRIPTION (wer genau: Abgrenzung, relevante Merkmale wie Alter,
   Situation, Einstellung), PROBLEM_NEED (welches Problem/welcher Bedarf, wie
   relevant/dringlich), BEHAVIOR_CONTEXT (Kauf-/Nutzungsverhalten, in welchem Kontext
   das Angebot genutzt würde), WILLINGNESS_TO_PAY (Zahlungsbereitschaft, ggf.
   plausible fiktive Preisspanne), REACHABILITY (über welche Kanäle erreichbar).
   Jede Aussage bleibt ein eigenständig prüfbarer Aussagesatz mit EIGENEM, ehrlich
   differenziertem Evidenzstatus — typischerweise ist DESCRIPTION besser gestützt als
   WILLINGNESS_TO_PAY (oft OPEN_QUESTION). Wenn der Nutzer keine Zielgruppe angegeben
   hat, leite die Segmente aus Geschäftsidee, Problem und Nutzenversprechen ab.
3. CUSTOMER_PROBLEM: 2–4 Aussagen zu Kundenproblemen und deren Relevanz.
4. COMPETITOR — ZWEI TEILE:

   a) WETTBEWERBERPROFILE: Identifiziere 5–7 relevante Akteure nach der
      Start-up-Definition: alle Unternehmen, Angebote oder Lösungen, die aus
      Kundensicht dasselbe Problem lösen, dasselbe Bedürfnis erfüllen oder eine
      ähnliche Alternative darstellen. Dazu gehören auch direkte Software-
      Wettbewerber, indirekte Anbieter (z. B. Agenturen), Substitute (Excel,
      manuelle Prozesse) und Status-quo-Alternativen (Nicht-Nutzung).

      Pro Akteur GENAU 6 Aussagen (category COMPETITOR) mit demselben
      competitorLabel (fiktiver Name, z. B. „SocialFlow Pro (fiktiv)") und je
      einem competitorAspect:
      - ENTITY_TYPE: Art aus Kundensicht (direkter Wettbewerber, indirekter
        Wettbewerber, Substitut oder Status quo) — als prüfbarer Satz.
      - OFFERING: Was das Angebot aus Kundensicht leistet.
      - TARGET_CUSTOMERS: Für wen primär gedacht (Segment, Region).
      - PRICING: Preismodell/Preisspanne — origin SIMULATED_RESEARCH mit
        sourceRef, realistische Spannen statt Scheinpräzision.
      - SCALE: Größe/Reichweite (z. B. Nutzer, Umsatzgrößenordnung, Team) —
        origin SIMULATED_RESEARCH mit sourceRef, als Spanne oder Schätzung.
      - RELEVANCE: Warum dieser Akteur für das Start-up relevant ist.

      Jede Profil-Aussage bleibt ein eigenständig prüfbarer Aussagesatz mit
      eigenem Evidenzstatus. Kennzahlen typischerweise ASSUMPTION oder
      OPEN_QUESTION, wenn unsicher.

   b) LANDSCHAFTS-AUSSAGEN: 2–3 übergreifende COMPETITOR-Statements OHNE
      competitorLabel (Marktstruktur, typisches Kundenverhalten, Lücken).
5. RESOURCE: 2–4 Aussagen zu internen Ressourcen/Fähigkeiten (aus dem Profil,
   meist FACT mit origin USER_INPUT).
6. SWOT: je Quadrant (STRENGTH, WEAKNESS, OPPORTUNITY, THREAT) 2–3 Aussagen,
   die die vorherigen Bereiche verdichten.
7. MARKET_PATH: 2–3 erkennbare Marktpfade als Aussagen (welche grundsätzlichen
   Wege der Marktbearbeitung sich abzeichnen) — immer ASSUMPTION.

Achte auf eine ehrliche Mischung: Es MUSS auch OPEN_QUESTIONs geben (typisch:
Zahlungsbereitschaft, tatsächliche Problemrelevanz, Kanalwirksamkeit).

Konsistenzregeln:
- pestelRelevance MUSS genau 6 Einträge enthalten, einen je PESTEL-Kategorie.
- Für jede Kategorie mit relevant=false darf im statements-Array KEINE Aussage mit dieser category stehen. Für relevant=true SOLL mindestens eine vorhanden sein.

AUSGABEFORMAT (JSON, exakt dieses Schema):
{
  "pestelRelevance": [
    {
      "category": "PESTEL_POLITICAL | PESTEL_ECONOMIC | PESTEL_SOCIAL | PESTEL_TECHNOLOGICAL | PESTEL_ECOLOGICAL | PESTEL_LEGAL",
      "relevant": true,
      "relevanceJustification": "string (vollständiger Satz, warum die Dimension relevant oder nachrangig ist)"
    }
  ],
  "statements": [
    {
      "category": "PESTEL_POLITICAL | PESTEL_ECONOMIC | PESTEL_SOCIAL | PESTEL_TECHNOLOGICAL | PESTEL_ECOLOGICAL | PESTEL_LEGAL | TARGET_SEGMENT | CUSTOMER_PROBLEM | COMPETITOR | RESOURCE | SWOT_STRENGTH | SWOT_WEAKNESS | SWOT_OPPORTUNITY | SWOT_THREAT | MARKET_PATH",
      "content": "string",
      "evidenceStatus": "FACT | ASSUMPTION | OPEN_QUESTION",
      "origin": "USER_INPUT | SIMULATED_RESEARCH | AI_DERIVATION",
      "justification": "string",
      "sourceRef": "string | null  (Pflicht bei SIMULATED_RESEARCH, endet mit '(fiktiv)')",
      "uncertainty": "string | null",
      "segmentLabel": "string | null  (Pflicht bei TARGET_SEGMENT: Name des Segments, z. B. Studierende mit begrenztem Budget)",
      "segmentAspect": "DESCRIPTION | PROBLEM_NEED | BEHAVIOR_CONTEXT | WILLINGNESS_TO_PAY | REACHABILITY | null  (Pflicht bei TARGET_SEGMENT)",
      "competitorLabel": "string | null  (Pflicht bei COMPETITOR-Profilen: fiktiver Akteursname, z. B. SocialFlow Pro (fiktiv))",
      "competitorAspect": "ENTITY_TYPE | OFFERING | TARGET_CUSTOMERS | PRICING | SCALE | RELEVANCE | null  (Pflicht bei COMPETITOR-Profilen)"
    }
  ]
}`;
