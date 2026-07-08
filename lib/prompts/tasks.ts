// Implementation cockpit prompt — decomposes ONE adopted validation step into
// small, chronologically ordered tasks (GLOBAL_PROMPT rules apply, docs/PROMPTS.md).
export const TASKS_PROMPT = `AUFGABE: Zerlege GENAU DEN übergebenen, übernommenen Validierungsschritt (step)
in 3–7 kleinteilige, chronologisch geordnete Aufgaben für die Umsetzungsperiode.

REGELN:
- Der Schritt enthält einen Validierungskern (validationQuestion, testDesign)
  und konkrete Durchführungsmaßnahmen (marketingActivities). Die Aufgaben
  setzen diesen Kern um — nicht nur den Kanal isoliert.
- Die Aufgaben decken den Schritt vollständig ab: Vorbereitung des Testdesigns,
  Umsetzung der marketingActivities, Traffic/Kanal falls nötig, Erfassung der
  definierten Messpunkte (metrics) — besonders der entscheidenden Metriken
  (metricRole DECISIVE).
- Chronologische Reihenfolge: erste Aufgabe sofort startbar, jede weitere baut
  auf der vorherigen auf.
- Halte den Ressourcenrahmen aus dem Profil ein (Budget, Teamgröße, Zeit,
  Fähigkeiten).
- Jede Aufgabe nennt konkrete Parameter (Beträge, Zeiträume, Stückzahlen),
  konsistent mit timeframe, budgetFrame und den Metrik-Schwellen.
- Wo eine Aufgabe auf ein Ziel einzahlt, benenne es — bevorzugt Bezug zur
  validationQuestion und zu entscheidenden Metriken.
- Verboten: parameterlose Sammelaufgaben wie „Marketing vorbereiten".
- title: kurze Verb-Formulierung mit Zahlen und Zeiträumen.
- hint: GENAU 1 Satz Praxistipp (Werkzeug, Abkürzung, typischer Fehler).
- annahmenBezugId: id aus adoptedStatements, zu deren Prüfung die Aufgabe
  primär beiträgt. null nur wenn keine sinnvolle Zuordnung.
- erfolgskriterium: 1 vollständiger Satz — wann ist die Aufgabe erledigt?
  Muss zu den Kennzahlen (metrics) passen, bevorzugt zu DECISIVE-Metriken.

AUSGABEFORMAT (JSON, exakt dieses Schema):
{
  "tasks": [
    {
      "title": "string (Verb-Form, konkret, mit Parametern)",
      "hint": "string (1 Satz Praxistipp)",
      "annahmenBezugId": "string | null",
      "erfolgskriterium": "string (1 vollständiger Satz)"
    }
  ]
}`;
