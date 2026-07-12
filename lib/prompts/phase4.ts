// Phase 4 prompt — critical assumptions and validation steps (docs/PROMPTS.md).
import {
  ASSUMPTION_TYPE_VALIDATION_MAP,
  CHANNEL_SELECTION_RULES,
  CRITERION_THRESHOLD_RULES,
  METRIC_EFFECT_LOGIC_RULES,
  METRIC_ROLE_RULES,
  SIGNAL_CATEGORY_RULES,
  VALIDATION_CORE_THINKING,
  VALIDATION_MODE_RULES,
  VALIDATION_STEP_OUTPUT_FIELDS,
} from "./validationCoreRules";

export const PHASE4_PROMPT = `AUFGABE: Identifiziere für die priorisierte Option die 2–4 KRITISCHSTEN Annahmen
aus der übergebenen Whitelist und übersetze jede in einen begrenzten, ressourcensensiblen
Validierungsschritt mit Testdesign, Durchführungsaktivitäten und Messpunkten.

Der Projektkontext enthält ggf. phasenEingaben (Rahmenbedingungen des Nutzers,
KEINE Aussagen), phasenEingabenRegeln, nutzerbedingungen, verfuegbareKanaele und annahmenPlanung.
Die annahmenPlanung enthält pro Annahme validationCore, evidenceContract, primaryTestSubject
und den serverseitig ausgewählten Testansatz (ausgewaehlterTestansatz).
Erzeuge jeden Schritt AUS diesem Testansatz — nicht unabhängig davon.
Wende phasenEingabenRegeln strikt an.

${CHANNEL_SELECTION_RULES}

${VALIDATION_CORE_THINKING}

${ASSUMPTION_TYPE_VALIDATION_MAP}

${SIGNAL_CATEGORY_RULES}

${VALIDATION_MODE_RULES}

REGELN:
- Kritisch = erfolgskritisch für die Stoßrichtung UND geringer Evidenzgrad (Annahme oder
  offene Frage). Nur IDs aus whitelist verwenden — Aussagen außerhalb existieren nicht.
- Jede kritische Annahme erhält GENAU EINEN Umsetzungsschritt.
- Jeder Schritt: konkret in 1–4 Wochen mit dem Profil-Budget umsetzbar.
- ${VALIDATION_STEP_OUTPUT_FIELDS}
- Jeder Schritt MUSS timeframe und budgetFrame enthalten.
- Je Schritt 1–3 Metriken mit signalCategory, metricRole und klaren Kriterien.
- ${METRIC_ROLE_RULES}
- ${METRIC_EFFECT_LOGIC_RULES}
- Erfolgs- und Misserfolgskriterien beschreiben AUSSCHLIESSLICH die Beobachtung.
- ${CRITERION_THRESHOLD_RULES}
- evaluationMode je Metrik: PER_POINT oder CUMULATIVE (PFLICHT).

AUSGABEFORMAT (JSON):
{
  "criticalAssumptions": ["statementId1", "statementId2"],
  "diversityNote": "string | null",
  "modeNote": null,
  "steps": [
    {
      "assumptionId": "statementId1",
      "strategyDimension": "MARKET_ACCESS",
      "testSubject": "WILLINGNESS_TO_PAY",
      "validationQuestion": "string",
      "testDesign": "string",
      "title": "string",
      "description": "string",
      "marketingActivities": ["string"],
      "channel": "string | null",
      "timeframe": "string",
      "budgetFrame": "string",
      "metrics": [
        {
          "name": "string",
          "evaluationMode": "PER_POINT | CUMULATIVE",
          "metricRole": "DECISIVE | SUPPORTING",
          "signalCategory": "COMMITMENT | BEHAVIOR | ATTENTION | QUALITATIVE",
          "proxyStrength": "DIRECT | PROXY (PFLICHT bei DECISIVE)",
          "signalRationale": "string (PFLICHT bei DECISIVE — Bezug zur Annahmen-Unsicherheit)",
          "successCriterion": "string (gilt als stützend, wenn ...)",
          "failureCriterion": "string (gilt als widerlegend, wenn ...)"
        }
      ]
    }
  ]
}`;
