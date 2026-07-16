// Implementation cockpit prompt — simulates fictional KPI data points for the
// metrics of ONE adopted validation step (GLOBAL_PROMPT rules apply, docs/PROMPTS.md).
export const KPI_SIMULATION_PROMPT = `AUFGABE: Erzeuge für JEDE übergebene Metrik (metrics) des Umsetzungsschritts
3–5 plausible, FIKTIVE Perioden-Werte, die zum gewählten Szenario (scenario)
UND zu den definierten Schwellen der Metrik passen.

REGELN:
- Szenario-Treue auf der jeweiligen Auswertungsebene (evaluationMode):
  - SUPPORTING: Das Ergebnis auf Auswertungsebene stützt die Annahme.
  - CONTRADICTING: Das Ergebnis auf Auswertungsebene widerspricht der Annahme.
  - MIXED: Das Ergebnis liegt zwischen Erfolgs- und Misserfolgsschwelle
    (teilweise gestützt) bzw. zeigt bei PER_POINT ein uneinheitliches Bild.
- Wertart und aggregationStrategy je Metrik sind verbindlich:
  - RATE_FROM_SUMS / COUNT_OF_TOTAL: Gib für JEDE Periode ausschließlich
    numerator (Treffer dieser Periode) und denominator (Beobachtungen dieser
    Periode) als Zahlen aus. Kein value, kein Prozenttext und niemals einen
    bereits kumulierten Zwischenstand ausgeben.
  - Alle anderen Strategien: Gib ausschließlich value als endliche Zahl ohne
    Einheit oder Beschreibung aus. Kein numerator/denominator.
- evaluationMode je Metrik (aus dem Kontext):
  - PER_POINT: Gib den numerischen Periodenwert an. Die Bewertung
    erfolgt je Periode gegen die Schwellen. Bei SUPPORTING liegen die meisten
    Periodenwerte über der Stütz-Schwelle; bei CONTRADICTING reißen die meisten
    das Misserfolgskriterium; bei MIXED eine Mischung ohne klaren Trend.
  - CUMULATIVE: Gib den Zuwachs JE Periode an — NICHT den kumulierten Stand.
    Die Gesamtsumme über alle Perioden wird gegen die Kriterien geprüft:
    Bei SUPPORTING erreicht die Endsumme die Erfolgsschwelle; bei
    CONTRADICTING liegt sie unter der Misserfolgsschwelle; bei MIXED dazwischen.
    Einzelwochen mit niedrigem Zuwachs sind kein Misserfolg, solange die Summe
    am Ende die Schwelle erreicht.
- assessment je Punkt: Für PER_POINT — SUPPORTING nur, wenn der Periodenwert das
  successCriterion erfüllt; CONTRADICTING nur, wenn er das failureCriterion
  erfüllt; sonst NEUTRAL. Für CUMULATIVE setze auf allen Punkten NEUTRAL —
  die Klassifikation erfolgt ausschließlich auf Periodenebene (serverseitig).
- Werte enthalten keine Labels oder Einheiten; die Anzeige formatiert sie aus
  den strukturierten Metrik-Metadaten.
- periodLabel: fortlaufende, gleichartige Perioden ("Woche 1", "Woche 2", …).
  Wenn im Kontext existingPeriodLabelsByMetric übergeben wird, setze die Zählung
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
          "periodLabel": "Woche 1",
          "value": 12.5,
          "assessment": "NEUTRAL"
        }
      ]
    }
  ]
}

Für RATE_FROM_SUMS und COUNT_OF_TOTAL: lasse den Key "value" komplett weg und
setze numerator sowie denominator als Zahlen (Beispielpunkt:
{"periodLabel":"Welle 1","numerator":4,"denominator":6,"assessment":"NEUTRAL"}).
Für alle anderen Strategien: lasse die Keys "numerator" und "denominator"
komplett weg und setze value als Zahl. Gib niemals JSON-null für weggelassene
Felder aus — fehlende Keys weglassen, nicht null setzen.}`
