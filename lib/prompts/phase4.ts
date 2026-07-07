// Phase 4 prompt — critical assumptions and validation steps (docs/PROMPTS.md).
export const PHASE4_PROMPT = `AUFGABE: Identifiziere für die priorisierte Option die 2–4 KRITISCHSTEN Annahmen
und übersetze jede in einen begrenzten, ressourcensensiblen Umsetzungsschritt
mit Messpunkten.

REGELN:
- Kritisch = erfolgsentscheidend für die Stoßrichtung UND geringer Evidenzgrad
  (bevorzugt OPEN_QUESTION, dann ASSUMPTION). Wähle aus den übergebenen
  Statements der Option und des Analysebilds; gib deren IDs zurück.
- Wenn im Kontext ein addressedSegmentProfile übergeben wird (das vollständige
  Segmentprofil der von der Option adressierten Zielgruppe), wähle kritische
  Annahmen BEVORZUGT aus dessen schwach gestützten Profilaspekten
  (OPEN_QUESTION vor ASSUMPTION — typisch Zahlungsbereitschaft oder
  Erreichbarkeit) und aus den Dimensionen der Option. Nutze die statementId
  der Profilaussagen unverändert.
- Jede kritische Annahme erhält GENAU EINEN Umsetzungsschritt.
- Jeder Schritt: konkret in 1–3 Wochen mit dem Profil-Budget umsetzbar
  (z. B. 5 Problem-Interviews, einfache Landingpage mit Warteliste, ein
  Kanaltest mit kleinem Budget). Kein breiter Rollout.
- Je Schritt 1–2 Metriken mit klarem Erfolgs- UND Misserfolgskriterium
  (vorab festgelegt, quantifiziert als Spanne oder Schwelle).
- Der Kanal muss zur Zielgruppe der Option passen — begründe das kurz in der
  description.

AUSGABEFORMAT (JSON, exakt dieses Schema; statementId/assumptionId sind die
id-Werte aus dem Kontext, unverändert übernehmen):
{
  "criticalAssumptions": ["statementId1", "statementId2"],
  "steps": [
    {
      "assumptionId": "statementId1",
      "title": "string",
      "description": "string (Was wird gemacht, warum dieser Kanal, welcher Aufwand)",
      "channel": "string | null",
      "metrics": [
        {
          "name": "string",
          "successCriterion": "string (gilt als stützend, wenn ...)",
          "failureCriterion": "string (gilt als widerlegend, wenn ...)"
        }
      ]
    }
  ]
}`;
