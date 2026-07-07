// Phase 4 scaling prompt — continuation mode after a confirmed CONTINUE
// decision (GLOBAL_PROMPT rules apply, see lib/openai.ts). The validated core
// stays untouched; execution is expanded in limited, observable steps.
export const PHASE4_SCALE_PROMPT = `AUFGABE: Die Anpassungsentscheidung lautet FORTFÜHREN — der strategische Kern
der priorisierten Option ist validiert. Leite 2–4 begrenzte AUSWEITUNGSSCHRITTE
ab, mit denen die Umsetzung kontrolliert skaliert wird (z. B. Budget auf dem
bewährten Kanal erhöhen, einen zweiten passenden Kanal hinzunehmen, Reichweite
oder Zielkreis vergrößern).

REGELN:
- KEINE neuen Validierungsexperimente für ungeprüfte Annahmen und KEINE
  Änderung an den Dimensionen der Option. Der validierte Kern bleibt stabil —
  es geht ausschließlich um die kontrollierte Ausweitung der Umsetzung.
- Jeder Schritt referenziert als assumptionId GENAU EINE der übergebenen
  gestützten Kernannahmen (supportedCriticalAssumptions): die Annahme, deren
  Tragfähigkeit im größeren Maßstab er beobachtet. Mehrere Schritte dürfen
  dieselbe Annahme referenzieren. Verwende KEINE anderen IDs.
- Baue auf den Kanälen/Schritten auf, mit denen die Annahmen geprüft wurden
  (testedWith im Kontext). Ein neuer Kanal ist nur zulässig, wenn er zur
  Zielgruppe der Option passt — begründe das kurz in der description.
- Jeder Schritt bleibt im Ressourcenrahmen des Profils (Budget, Teamgröße,
  Zeit, Fähigkeiten) und ist konkret umsetzbar. Kein ungebremster Rollout —
  die Ausweitung erfolgt in begrenzten, beobachtbaren Stufen.
- Je Schritt 1–2 Monitoring-Metriken mit klaren Schwellen (quantifiziert als
  Spanne oder Schwelle): successCriterion = gilt als stützend, wenn die
  Annahme auch im größeren Maßstab hält; failureCriterion = gilt als
  widerlegend, wenn die Wirkung beim Ausweiten einbricht.
- criticalAssumptions: die IDs der gestützten Kernannahmen, die von den
  Schritten beobachtet werden (Teilmenge der übergebenen IDs).

AUSGABEFORMAT (JSON, exakt dieses Schema; assumptionId sind die id-Werte aus
supportedCriticalAssumptions, unverändert übernehmen):
{
  "criticalAssumptions": ["statementId1", "statementId2"],
  "steps": [
    {
      "assumptionId": "statementId1",
      "title": "string",
      "description": "string (Was wird ausgeweitet, warum dieser Kanal, welcher Aufwand)",
      "channel": "string | null",
      "metrics": [
        {
          "name": "string",
          "successCriterion": "string (gilt als stützend, wenn die Annahme auch im größeren Maßstab hält ...)",
          "failureCriterion": "string (gilt als widerlegend, wenn die Wirkung beim Ausweiten einbricht ...)"
        }
      ]
    }
  ]
}`;
