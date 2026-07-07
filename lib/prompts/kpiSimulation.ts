// Implementation cockpit prompt — simulates fictional KPI data points for the
// metrics of ONE adopted validation step (GLOBAL_PROMPT rules apply, docs/PROMPTS.md).
export const KPI_SIMULATION_PROMPT = `AUFGABE: Erzeuge für JEDE übergebene Metrik (metrics) des Umsetzungsschritts
3–5 plausible, FIKTIVE Perioden-Werte, die zum gewählten Szenario (scenario)
UND zu den definierten Schwellen der Metrik passen.

REGELN:
- Szenario-Treue (bezogen auf successCriterion und failureCriterion der Metrik):
  - SUPPORTING: Die Werte liegen überwiegend über der Stütz-Schwelle
    (successCriterion erfüllt); einzelne Perioden dürfen schwächer ausfallen,
    der Gesamttrend stützt die Annahme.
  - CONTRADICTING: Die Werte reißen überwiegend das Misserfolgskriterium
    (failureCriterion erfüllt); der Gesamttrend widerspricht der Annahme.
  - MIXED: Uneinheitliches Bild — Mischung aus stützenden, neutralen und
    widersprechenden Perioden ohne klaren Trend.
- metricType je Metrik (aus dem Kontext):
  - RATE: Gib den Periodenwert an (z. B. „2,5 %", „3,2 %"). Die Bewertung
    erfolgt je Periode gegen die Schwellen.
  - CUMULATIVE: Gib den Zuwachs JE Periode an (z. B. „12 neue Anfragen" in
    Woche 1, „8 neue Anfragen" in Woche 2) — NICHT den kumulierten Stand.
    Die Gesamtsumme über alle Perioden wird serverseitig gegen die Kriterien
    geprüft; Einzelwochen mit niedrigem Zuwachs sind kein Misserfolg, solange
    die Summe am Ende die Schwelle erreicht.
- assessment je Punkt: Für RATE wie bisher — SUPPORTING nur, wenn der
  Periodenwert das successCriterion erfüllt; CONTRADICTING nur, wenn er das
  failureCriterion erfüllt; sonst NEUTRAL. Für CUMULATIVE setze vorerst
  NEUTRAL auf Zwischenperioden; die endgültige Bewertung erfolgt serverseitig
  über die kumulierte Summe.
- value: kurzer, konkreter Wert mit Einheit bzw. Bezugsgröße (z. B.
  "14 Registrierungen", "3 von 5 Interviews bestätigen das Problem",
  "Conversion 1,8 %"). Realistische Größenordnungen für den Ressourcenrahmen
  des Profils — keine Scheinpräzision.
- periodLabel: fortlaufende, gleichartige Perioden ("Woche 1", "Woche 2", …).
  Wenn im Kontext existingPeriodLabels übergeben werden, setze die Zählung
  nahtlos fort (nach "Woche 3" folgt "Woche 4") statt neu zu beginnen.
- Alle Metriken erhalten dieselben Perioden-Labels (gleicher Zeitraum).
- Die Werte sind Teil des Simulationsmodus und damit FIKTIV — erfinde keine
  Quellen, es sind eigene (simulierte) Messwerte des Start-ups.

AUSGABEFORMAT (JSON, exakt dieses Schema; metricId sind die id-Werte aus dem
Kontext, unverändert übernehmen):
{
  "series": [
    {
      "metricId": "string",
      "points": [
        {
          "periodLabel": "string (z. B. Woche 1)",
          "value": "string",
          "assessment": "SUPPORTING | NEUTRAL | CONTRADICTING"
        }
      ]
    }
  ]
}`;
