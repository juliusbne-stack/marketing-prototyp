// Phase 5 prompt — learning and strategic adaptation (docs/PROMPTS.md).
export const PHASE5_PROMPT = `AUFGABE: Interpretiere die vom Nutzer erfassten Marktrückmeldungen im Hinblick auf
die jeweils geprüfte Annahme, schlage Evidenz-Updates vor und bereite eine
Anpassungsentscheidung vor.

REGELN:
- Je Rückmeldung: Bewerte gegen die geprüfte Annahme UND die vorab definierten
  Messpunkte. Bezugspunkt ist die ANNAHME — nicht die Marketingmaßnahme an sich.
  result: SUPPORTED | PARTIALLY_SUPPORTED | REFUTED | AMBIGUOUS.
- METRIK-ROLLEN (metricRole im Kontext je Metrik):
  - Für result SUPPORTED oder REFUTED zählen primär entscheidende Metriken
    (DECISIVE). Sie müssen die Annahme direkt adressieren.
  - proxyStrength (im Kontext je Metrik): Eine DECISIVE-Metrik mit proxyStrength
    = PROXY belegt die Annahme nur mittelbar (z. B. Anmeldung ≠ Nutzung). Ein
    erfülltes PROXY-Kriterium rechtfertigt höchstens PARTIALLY_SUPPORTED, niemals
    SUPPORTED, und niemals eine Hochstufung zu FACT.
  - Wenn nur unterstützende Metriken (SUPPORTING, z. B. Reichweite, CTR,
    Engagement, Impressions) die Schwellen erfüllen, die entscheidenden Metriken
    zur Annahme aber nicht oder nur indirekt: höchstens PARTIALLY_SUPPORTED
    oder AMBIGUOUS — niemals SUPPORTED. Benenne in der interpretation explizit:
    „Diese Metrik misst [X], die Annahme behauptet [Y] — Aussagekraft begrenzt."
  - Beispiel: Annahme = Zahlungsbereitschaft 60–150 €, Metrik = Reichweite/CTR
    ohne Preissignal → höchstens PARTIALLY_SUPPORTED, auch wenn Schwellen
    übertroffen wurden.
- proposedNewStatus: Der Statusvorschlag berücksichtigt die GESAMTE
  Prüfhistorie der Aussage (mitgeliefert als Zählung: X× gestützt, Y× teilweise,
  Z× widerlegt — Feld validationHistory je geprüfter Annahme) und bewegt sich
  in STUFEN (OPEN_QUESTION ↔ ASSUMPTION ↔ FACT), nie um zwei Stufen in einem
  Schritt:
  (a) Heraufstufung zu FACT nur bei mehreren konsistent stützenden, möglichst
      direkten Rückmeldungen (entscheidende Metriken) ohne aktuelle Widerlegung.
  (b) Widerspricht eine neue Rückmeldung einer bisher gestützten Aussage:
      EINE Stufe herab (FACT→ASSUMPTION) und in der interpretation den
      Widerspruch zur bisherigen Evidenz benennen sowie empfehlen, was genauer
      zu prüfen ist.
  (c) Erst bei wiederholten oder eindeutig direkten Widerlegungen weiter herab
      (ASSUMPTION→OPEN_QUESTION).
  (d) Bewerte result strikt gegen die vorab definierten Erfolgs-/
      Misserfolgskriterien: Ist ein Misserfolgskriterium einer entscheidenden
      Metrik erfüllt, MUSS result REFUTED sein. Ist nur ein Misserfolgskriterium
      einer unterstützenden Metrik erfüllt, ohne dass entscheidende Metriken
      klar stützen: PARTIALLY_SUPPORTED oder AMBIGUOUS.
  Bei AMBIGUOUS: Status unverändert (proposedNewStatus: null), neue offene
  Frage als newStatement vorschlagen.
- interpretation: kurz, ehrlich, inkl. Grenzen der Aussagekraft (kleine
  Stichprobe, situative Einflüsse, Proxy-Metriken). Wenn die signalRationale
  einer DIRECT-Metrik erkennbar einen anderen Gegenstand trifft als die
  uncertainty der Annahme, benenne das in der interpretation als Einschränkung.
- adaptation: genau EIN Vorschlag: CONTINUE | ADAPT | DEFER | DISCARD | LOOP_BACK
  (mit loopBackToPhase 1–3). Formuliere als Vorschlag — die Entscheidung trifft
  der Nutzer. Wähle die Anpassungsentscheidung streng nach diesen Kriterien und
  nenne in der rationale ausdrücklich die Evidenz, auf die du dich stützt:
  - CONTINUE ist der Standard, wenn die geprüften kritischen Annahmen
    überwiegend gestützt wurden (über entscheidende Metriken) und KEINE
    erfolgskritische Annahme widerlegt ist. Neue offene Fragen oder Detail-
    Verbesserungsideen sind KEIN Grund für ADAPT.
  - ADAPT nur, wenn eine konkrete, erfolgskritische Annahme widerlegt oder
    deutlich geschwächt wurde UND die Stoßrichtung insgesamt tragfähig bleibt.
  - DEFER/DISCARD, wenn tragende Annahmen (Kundenproblem,
    Zahlungsbereitschaft, Zielgruppenbedarf) widerlegt sind.
  - LOOP_BACK nur bei grundlegend neuen Erkenntnissen über Markt oder Kunden.
  - Berücksichtige die mitgelieferte Evidenzbilanz der Option (evidenceBalance).
- newStatements: 0–3 neue Erkenntnisse oder offene Fragen (category LEARNING).

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
