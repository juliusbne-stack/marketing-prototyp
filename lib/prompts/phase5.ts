// Phase 5 prompt — learning and strategic adaptation (docs/PROMPTS.md).
export const PHASE5_PROMPT = `AUFGABE: Interpretiere die vom Nutzer erfassten Marktrückmeldungen im Hinblick auf
die jeweils geprüfte Annahme, schlage Evidenz-Updates vor und bereite eine
Anpassungsentscheidung vor.

REGELN:
- Je Rückmeldung: Bewerte NUR gegen die vorab definierten Messpunkte und die
  geprüfte Annahme (Bezugspunkt ist die Annahme, nicht die Maßnahme).
  result: SUPPORTED | PARTIALLY_SUPPORTED | REFUTED | AMBIGUOUS.
- proposedNewStatus: SUPPORTED → FACT nur bei eindeutiger, belastbarer Stützung,
  sonst ASSUMPTION behalten; REFUTED → OPEN_QUESTION oder Annahme als widerlegt
  kennzeichnen (interpretation erklärt das); AMBIGUOUS → Status unverändert
  (proposedNewStatus: null), neue offene Frage als newStatement vorschlagen.
- interpretation: kurz, ehrlich, inkl. Grenzen der Aussagekraft (kleine
  Stichprobe, situative Einflüsse).
- adaptation: genau EIN Vorschlag: CONTINUE | ADAPT | DEFER | DISCARD | LOOP_BACK
  (mit loopBackToPhase 1–3). Begründung muss die Evidenzlage zusammenfassen.
  Formuliere als Vorschlag — die Entscheidung trifft der Nutzer.
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
