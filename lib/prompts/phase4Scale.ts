// Phase 4 scaling prompt — continuation mode after a confirmed CONTINUE decision.
import {
  ASSUMPTION_TYPE_VALIDATION_MAP,
  CRITERION_THRESHOLD_RULES,
  METRIC_ROLE_RULES,
  SCALING_MODE_RULES,
  SIGNAL_CATEGORY_RULES,
  VALIDATION_CORE_THINKING,
  VALIDATION_STEP_OUTPUT_FIELDS,
} from "./validationCoreRules";

export const PHASE4_SCALE_PROMPT = `AUFGABE: Die Anpassungsentscheidung lautet FORTFÜHREN — leite 2–4 begrenzte
Skalierungsschritte ab, die gestützte Fakten aus der Whitelist im größeren Maßstab
weiter beobachten.

${VALIDATION_CORE_THINKING}

${ASSUMPTION_TYPE_VALIDATION_MAP}

${SIGNAL_CATEGORY_RULES}

${SCALING_MODE_RULES}

REGELN:
- Skaliere den TEST, nicht blind den Kanal: Bei Zahlungsbereitschaft = mehr Besucher auf
  derselben Preis-Landingpage, nicht nur mehr Impressions ohne Preissignal.
- Jeder Schritt referenziert als assumptionId GENAU EINE Whitelist-ID.
- Baue auf dem Testdesign der bisherigen Schritte auf (testedWith im Kontext).
- Skalierungsschritte dürfen ausschließlich Kanäle aus validatedChannels nutzen.
  Ein bisher nicht validierter Kanal führt eine ungeprüfte Erreichbarkeitsannahme ein
  und ist im Fortführungsmodus unzulässig. Wenn ein neuer Kanal fachlich sinnvoll wäre,
  schlage ihn NICHT als Schritt vor, sondern setze modeNote mit dem Hinweis, dass dafür
  ADAPT statt CONTINUE zu wählen ist.
- ${VALIDATION_STEP_OUTPUT_FIELDS}
- Jeder Schritt MUSS timeframe und budgetFrame enthalten.
- Je Schritt 1–3 Monitoring-Metriken mit signalCategory und klaren Schwellen.
- ${METRIC_ROLE_RULES}
- Erfolgskriterien: „Skalierung trägt wenn …" / „Skalierungsgrenze erreicht wenn …"
- ${CRITERION_THRESHOLD_RULES}
- criticalAssumptions: IDs aus der Whitelist, die von den Schritten beobachtet werden.

AUSGABEFORMAT (JSON):
{
  "criticalAssumptions": ["statementId1"],
  "diversityNote": null,
  "modeNote": "string | null",
  "steps": [ /* wie Phase 4, inkl. strategyDimension, testSubject, signalCategory */ ]
}`;
