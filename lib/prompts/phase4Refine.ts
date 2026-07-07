// Phase 4 refinement prompt — dialogic revision of ONE validation step based
// on informal user feedback (GLOBAL_PROMPT rules apply, see lib/openai.ts).
export const PHASE4_REFINE_PROMPT = `AUFGABE: Überarbeite GENAU DEN übergebenen Umsetzungsschritt (currentStep)
gemäß dem aktuellen Nutzerfeedback (userFeedback). Erfinde keinen neuen,
unabhängigen Schritt — es geht um eine Verfeinerung des bestehenden Entwurfs.

REGELN:
- Die Prüfung muss weiterhin DIESELBE kritische Annahme (criticalAssumption)
  adressieren. Ändere nicht, WAS geprüft wird — nur WIE.
- Halte den Ressourcenrahmen aus dem Profil ein (Budget, Teamgröße, Zeit,
  Fähigkeiten). Der Schritt bleibt konkret in 1–3 Wochen umsetzbar, kein
  breiter Rollout.
- timeframe und budgetFrame MÜSSEN gesetzt sein und an das Feedback angepasst
  werden, wenn es Ressourcen oder den Zeitraum betrifft (siehe Regeln oben in
  Phase 4: begrenzter Zeitraum 1–4 Wochen, tragbarer Budgetanteil).
- previousFeedbackRounds enthält die Nutzeranweisungen früherer
  Verfeinerungsrunden (mit dem Titel des jeweiligen Ergebnisses). Respektiere
  ALLE bisherigen Anweisungen weiterhin, sofern das aktuelle Feedback sie
  nicht ausdrücklich aufhebt.
- Je Schritt 1–2 Metriken mit klarem Erfolgs- UND Misserfolgskriterium
  (vorab festgelegt, quantifiziert als Spanne oder Schwelle). Passe die
  Metriken an, wenn die Überarbeitung sie betrifft.
- metricType je Metrik (PFLICHT): RATE = Periodenwert je Woche/Periode;
  CUMULATIVE = Zähler über die gesamte Prüfperiode (Kriterien beziehen sich
  auf die Gesamtsumme).
- Wenn der Kanal geändert wird, muss der neue Kanal zur Zielgruppe passen —
  begründe das kurz in der description.
- changeSummary: 1–2 Sätze, was gegenüber dem bisherigen Entwurf geändert
  wurde und warum.

AUSGABEFORMAT (JSON, exakt dieses Schema):
{
  "title": "string",
  "description": "string (Was wird gemacht, warum dieser Kanal, welcher Aufwand)",
  "channel": "string | null",
  "timeframe": "string (begrenzter Zeitraum, z. B. 2 Wochen)",
  "budgetFrame": "string (tragbarer Budgeteinsatz, z. B. 0 € — Zeiteinsatz ca. 4 Std./Woche)",
  "metrics": [
    {
      "name": "string",
      "metricType": "RATE | CUMULATIVE",
      "successCriterion": "string (gilt als stützend, wenn ...)",
      "failureCriterion": "string (gilt als widerlegend, wenn ...)"
    }
  ],
  "changeSummary": "string (1–2 Sätze: was geändert wurde und warum)"
}`;
