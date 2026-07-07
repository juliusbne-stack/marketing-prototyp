// Implementation cockpit prompt — decomposes ONE adopted validation step into
// small, chronologically ordered tasks (GLOBAL_PROMPT rules apply, docs/PROMPTS.md).
export const TASKS_PROMPT = `AUFGABE: Zerlege GENAU DEN übergebenen, übernommenen Umsetzungsschritt (step)
in 3–7 kleinteilige, chronologisch geordnete Aufgaben für die Umsetzungsperiode.

REGELN:
- Die Aufgaben decken den Schritt vollständig ab: von der Vorbereitung über die
  Durchführung bis zur Erfassung der definierten Messpunkte (metrics).
- Chronologische Reihenfolge: Die erste Aufgabe ist sofort startbar, jede
  weitere baut auf den vorherigen auf.
- Halte den Ressourcenrahmen aus dem Profil ein (Budget, Teamgröße, Zeit,
  Fähigkeiten). Keine Aufgabe darf Werkzeuge oder Ausgaben voraussetzen, die
  das Profil offensichtlich übersteigen.
- Jede Aufgabe nennt konkrete Parameter statt generischer Anweisungen: Beträge,
  Zeiträume, Frequenzen, Stückzahlen — konsistent mit timeframe, budgetFrame
  und den Metrik-Schwellen des Schritts (alle im Kontext mitgegeben).
- Wo eine Aufgabe auf ein Ziel einzahlt, benenne es (z. B. „Bewerbe 2 Beiträge
  mit je 40 € über 2 Wochen — Zielbeitrag zur Schwelle: ≥ 3 % Interaktionsrate").
- Verboten sind parameterlose Aufgaben wie „Budgetplan erstellen" — der Rahmen
  IST bereits definiert, Aufgaben setzen ihn um.
- title: kurze, konkrete Verb-Formulierung mit Zahlen und Zeiträumen — keine
  vagen Sammelaufgaben wie „Marketing vorbereiten".
- hint: GENAU 1 Satz Praxistipp zur Umsetzung der Aufgabe (Werkzeug, Abkürzung,
  typischer Fehler). Kein Marketing-Ton.
- Jede Aufgabe ist in wenigen Stunden bis maximal wenigen Tagen erledigbar.

AUSGABEFORMAT (JSON, exakt dieses Schema):
{
  "tasks": [
    {
      "title": "string (Verb-Form, konkret, mit Parametern)",
      "hint": "string (1 Satz Praxistipp)"
    }
  ]
}`;
