// Phase 4 — single validation block refinement (critical assumption + step +
// metrics). Preview only until the user adopts (GLOBAL_PROMPT rules apply).
import {
  ASSUMPTION_TYPE_VALIDATION_MAP,
  CRITERION_THRESHOLD_RULES,
  METRIC_ROLE_RULES,
  VALIDATION_CORE_THINKING,
  VALIDATION_STEP_OUTPUT_FIELDS,
} from "./validationCoreRules";

export const PHASE4_REFINE_VALIDATION_PROMPT = `AUFGABE: Überarbeite GENAU DIESE Validierung (criticalAssumption + currentStep +
metrics) gemäß dem Nutzerhinweis (userInstruction). Erzeuge eine verbesserte,
besser prüfbare Version — kein neues, unabhängiges Validierungspaket.

Phase 4 dient der Validierung und Operationalisierung der priorisierten
Strategieoption. Sie darf die Strategie nicht unbemerkt neu formulieren.

${VALIDATION_CORE_THINKING}

${ASSUMPTION_TYPE_VALIDATION_MAP}

REGELN:
- Die überarbeitete Aussage (revisedStatement) muss ein vollständiger,
  prüfbarer Behauptungssatz sein — kein Fragment, keine bloße Stichwortliste.
- Der Umsetzungsschritt muss die überarbeitete Aussage direkt prüfen — nicht
  eine andere Hypothese. Kanäle sind Durchführung, nicht der Test.
- ${VALIDATION_STEP_OUTPUT_FIELDS}
- revisedMetrics: 1–3 Messpunkte, konkret und auswertbar.
- ${METRIC_ROLE_RULES}
- Erfolgs- und Misserfolgskriterien beschreiben AUSSCHLIESSLICH die Beobachtung,
  nie die Konsequenz.
- ${CRITERION_THRESHOLD_RULES}
- evaluationMode je Metrik (PFLICHT): PER_POINT oder CUMULATIVE.
- Halte Budget, Teamgröße, Zeit und Skills aus dem Profil ein.
- Entwickle keine völlig neue Strategie.
- previousRefinementRounds: frühere Nutzeranweisungen respektieren.
- rationale: 1–2 Sätze, warum die neue Version besser validierbar ist.
- strategyAdjustmentHint: nur bei strategischer Neuausrichtung; sonst null.

AUSGABEFORMAT (JSON, exakt dieses Schema):
{
  "revisedStatement": {
    "content": "string (vollständiger prüfbarer Behauptungssatz)",
    "evidenceStatus": "FACT | ASSUMPTION | OPEN_QUESTION",
    "justification": "string | null",
    "uncertainty": "string | null"
  },
  "revisedValidationStep": {
    "validationQuestion": "string",
    "testDesign": "string",
    "title": "string",
    "description": "string",
    "marketingActivities": ["string", "string"],
    "channel": "string | null",
    "timeframe": "string (begrenzter Zeitraum, z. B. 2 Wochen)",
    "budgetFrame": "string (tragbarer Budgeteinsatz)"
  },
  "revisedMetrics": [
    {
      "name": "string",
      "evaluationMode": "PER_POINT | CUMULATIVE",
      "metricRole": "DECISIVE | SUPPORTING",
      "successCriterion": "string (gilt als stützend, wenn ...)",
      "failureCriterion": "string (gilt als widerlegend, wenn ...)"
    }
  ],
  "rationale": "string (warum die neue Version besser validierbar ist)",
  "strategyAdjustmentHint": "string | null"
}`;
