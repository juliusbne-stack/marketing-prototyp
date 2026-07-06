// Phase 2 prompt — development of preliminary strategy options (docs/PROMPTS.md).
export const PHASE2_PROMPT = `AUFGABE: Entwickle aus dem übergebenen Analysebild (adopted Statements aus Phase 1)
GENAU 2 bis 3 klar voneinander abgegrenzte, vorläufige Strategieoptionen als
Hypothesenbündel.

REGELN:
- Mindestens eine Option ist marktbezogen (greift einen MARKET_PATH auf),
  mindestens eine ist mittelorientiert (setzt an vorhandenen Ressourcen,
  Fähigkeiten oder Netzwerken aus dem Profil an).
- Jede Option enthält GENAU 6 Dimensionen (je 1 Aussage): OPT_TARGET_GROUP,
  OPT_CUSTOMER_PROBLEM, OPT_VALUE_PROPOSITION, OPT_POSITIONING,
  OPT_MARKET_ACCESS, OPT_REVENUE_GROWTH.
- Der Evidenzstatus jeder Dimension leitet sich aus dem Analysebild ab: Baut die
  Dimension auf übernommenen FACTs auf → ASSUMPTION mit Verweis darauf in der
  justification; baut sie auf OPEN_QUESTIONs auf → OPEN_QUESTION. Dimensionen
  einer neuen Option sind nie FACT.
- Die Optionen müssen sich in Zielgruppe ODER Marktzugang ODER Erlöslogik
  deutlich unterscheiden — keine Varianten derselben Idee.
- Keine Bewertung, kein Favorit, keine Empfehlung (das ist Phase 3).

AUSGABEFORMAT (JSON, exakt dieses Schema):
{
  "options": [
    {
      "title": "string (prägnant, z. B. 'Fokus: Boutique-Studios in Großstädten')",
      "summary": "string (2–3 Sätze Stoßrichtung)",
      "dimensions": [
        {
          "category": "OPT_TARGET_GROUP | OPT_CUSTOMER_PROBLEM | OPT_VALUE_PROPOSITION | OPT_POSITIONING | OPT_MARKET_ACCESS | OPT_REVENUE_GROWTH",
          "content": "string",
          "evidenceStatus": "ASSUMPTION | OPEN_QUESTION",
          "origin": "AI_DERIVATION",
          "justification": "string (mit Bezug auf das Analysebild)",
          "uncertainty": "string | null"
        }
      ]
    }
  ]
}`;
