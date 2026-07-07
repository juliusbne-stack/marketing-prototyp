// Phase 5 prompt — learning and strategic adaptation (docs/PROMPTS.md).
export const PHASE5_PROMPT = `AUFGABE: Interpretiere die vom Nutzer erfassten Marktrückmeldungen im Hinblick auf
die jeweils geprüfte Annahme, schlage Evidenz-Updates vor und bereite eine
Anpassungsentscheidung vor.

REGELN:
- Je Rückmeldung: Bewerte NUR gegen die vorab definierten Messpunkte und die
  geprüfte Annahme (Bezugspunkt ist die Annahme, nicht die Maßnahme).
  result: SUPPORTED | PARTIALLY_SUPPORTED | REFUTED | AMBIGUOUS.
- proposedNewStatus: Der Statusvorschlag berücksichtigt die GESAMTE
  Prüfhistorie der Aussage (mitgeliefert als Zählung: X× gestützt, Y× teilweise,
  Z× widerlegt — Feld validationHistory je geprüfter Annahme) und bewegt sich
  in STUFEN (OPEN_QUESTION ↔ ASSUMPTION ↔ FACT), nie um zwei Stufen in einem
  Schritt:
  (a) Heraufstufung zu FACT nur bei mehreren konsistent stützenden, möglichst
      direkten Rückmeldungen ohne aktuelle Widerlegung.
  (b) Widerspricht eine neue Rückmeldung einer bisher gestützten Aussage:
      EINE Stufe herab (FACT→ASSUMPTION) und in der interpretation den
      Widerspruch zur bisherigen Evidenz benennen sowie empfehlen, was genauer
      zu prüfen ist.
  (c) Erst bei wiederholten oder eindeutig direkten Widerlegungen weiter herab
      (ASSUMPTION→OPEN_QUESTION).
  (d) Bewerte result strikt gegen die vorab definierten Erfolgs-/
      Misserfolgskriterien des Schritts: Ist ein Misserfolgskriterium erfüllt,
      MUSS result REFUTED sein, unabhängig davon, wie positiv die Rückmeldung
      sonst klingt.
  Bei AMBIGUOUS: Status unverändert (proposedNewStatus: null), neue offene
  Frage als newStatement vorschlagen.
- interpretation: kurz, ehrlich, inkl. Grenzen der Aussagekraft (kleine
  Stichprobe, situative Einflüsse).
- adaptation: genau EIN Vorschlag: CONTINUE | ADAPT | DEFER | DISCARD | LOOP_BACK
  (mit loopBackToPhase 1–3). Formuliere als Vorschlag — die Entscheidung trifft
  der Nutzer. Wähle die Anpassungsentscheidung streng nach diesen Kriterien und
  nenne in der rationale ausdrücklich die Evidenz, auf die du dich stützt:
  - CONTINUE ist der Standard, wenn die geprüften kritischen Annahmen
    überwiegend gestützt wurden und KEINE erfolgskritische Annahme widerlegt
    ist. Neue offene Fragen oder Detail-Verbesserungsideen sind KEIN Grund für
    ADAPT — sie können bei der breiteren Umsetzung beobachtet werden.
    Wiederholtes Anpassen hat Kosten: Jede Überarbeitung macht die betroffene
    Dimension wieder zur ungeprüften Annahme und verhindert, dass die
    Strategie Wirkung entfalten kann.
  - ADAPT nur, wenn eine konkrete, erfolgskritische Annahme widerlegt oder
    deutlich geschwächt wurde UND die Stoßrichtung insgesamt tragfähig bleibt.
    Benenne dann exakt, WELCHE Dimension aufgrund WELCHER Rückmeldung
    angepasst werden soll.
  - DEFER/DISCARD, wenn tragende Annahmen (Kundenproblem,
    Zahlungsbereitschaft, Zielgruppenbedarf) widerlegt sind.
  - LOOP_BACK nur bei grundlegend neuen Erkenntnissen über Markt oder Kunden,
    die das Analysebild selbst infrage stellen.
  - Berücksichtige die mitgelieferte Evidenzbilanz der Option (evidenceBalance
    im Kontext): Je höher der Anteil faktengestützter Dimensionen und je
    weniger offene kritische Annahmen, desto stärker spricht die Lage für
    CONTINUE.
- newStatements: 0–3 neue Erkenntnisse oder offene Fragen (category LEARNING),
  die sich aus den Rückmeldungen ergeben.

AUSGABEFORMAT (JSON, exakt dieses Schema; feedbackId/statementId sind die
id-Werte aus dem Kontext, unverändert übernehmen):
{
  "feedbackAssessments": [
    {
      "feedbackId": "string",
      "statementId": "string",
      "result": "SUPPORTED | PARTIALLY_SUPPORTED | REFUTED | AMBIGUOUS",
      "interpretation": "string",
      "proposedNewStatus": "FACT | ASSUMPTION | OPEN_QUESTION | null"
    }
  ],
  "newStatements": [
    {
      "category": "LEARNING",
      "content": "string",
      "evidenceStatus": "ASSUMPTION | OPEN_QUESTION",
      "origin": "AI_DERIVATION",
      "justification": "string",
      "uncertainty": "string | null"
    }
  ],
  "adaptation": {
    "decision": "CONTINUE | ADAPT | DEFER | DISCARD | LOOP_BACK",
    "loopBackToPhase": 2,
    "rationale": "string"
  }
}
Hinweis: loopBackToPhase nur bei LOOP_BACK angeben, sonst null.`;
