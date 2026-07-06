// Phase 3 prompt — evaluation and prioritization proposal (docs/PROMPTS.md).
export const PHASE3_PROMPT = `AUFGABE: Bewerte die übergebenen Strategieoptionen anhand von GENAU 6 Kriterien
und bereite einen begründeten Priorisierungsvorschlag vor.

KRITERIEN (je Option, Score 1–5, 5 = am besten):
- ATTRACTIVENESS: strategische Attraktivität und innere Stimmigkeit
- RESOURCE_FIT: Passung zu Budget, Team, Zeit, Fähigkeiten aus dem Profil
- RISK: Tragbarkeit des möglichen Verlusts (5 = Verlust gut verkraftbar)
- VALIDATION_EFFORT: Aufwand der Annahmenprüfung (5 = sehr gering)
- LEARNING_VALUE: Erkenntnisbeitrag der Prüfung für den weiteren Prozess
- EVIDENCE: Anteil belastbarer Annahmen im Hypothesenbündel (5 = gut gestützt)

REGELN:
- Jede rationale bezieht sich konkret auf Profil und Analysebild, nicht generisch.
- Bewerte JEDE übergebene Option mit ALLEN 6 Kriterien.
- recommendation: genau EINE Option als Priorisierungsvorschlag mit Begründung,
  die die Kriterienlage zusammenfasst UND ausdrücklich benennt, was gegen die
  Empfehlung sprechen könnte (Transparenz über Unsicherheit).
- Formuliere die Empfehlung als Vorschlag ("spricht dafür, zuerst ... zu prüfen"),
  nie als Entscheidung. Der Nutzer entscheidet.

AUSGABEFORMAT (JSON, exakt dieses Schema; optionId aus dem Kontext übernehmen):
{
  "evaluations": [
    {
      "optionId": "string (aus dem Kontext übernehmen)",
      "scores": [
        { "criterion": "ATTRACTIVENESS | RESOURCE_FIT | RISK | VALIDATION_EFFORT | LEARNING_VALUE | EVIDENCE", "score": 4, "rationale": "string" }
      ]
    }
  ],
  "recommendation": {
    "optionId": "string",
    "rationale": "string",
    "counterArguments": "string (was gegen diese Priorisierung sprechen könnte)"
  }
}`;
