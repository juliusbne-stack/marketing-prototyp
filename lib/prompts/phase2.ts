// Phase 2 prompt — development of preliminary strategy options (docs/PROMPTS.md).
export const PHASE2_PROMPT = `AUFGABE: Entwickle aus dem übergebenen Analysebild (adopted Statements aus Phase 1)
GENAU 2 bis 3 klar voneinander abgegrenzte, vorläufige Strategieoptionen als
Hypothesenbündel.

Der Projektkontext enthält ggf. phasenEingaben (Rahmenbedingungen des Nutzers,
KEINE Aussagen) und phasenEingabenRegeln. Wende diese Regeln strikt an.

REGELN:
- Mindestens eine Option ist marktbezogen (greift einen MARKET_PATH auf),
  mindestens eine ist mittelorientiert (setzt an vorhandenen Ressourcen,
  Fähigkeiten oder Netzwerken aus dem Profil an).
- Jede Option enthält GENAU 6 Dimensionen (je 1 Aussage): OPT_TARGET_GROUP,
  OPT_CUSTOMER_PROBLEM, OPT_VALUE_PROPOSITION, OPT_POSITIONING,
  OPT_MARKET_ACCESS, OPT_REVENUE_GROWTH.
- Die Strategieoption beschreibt die Stoßrichtung (title, summary). Ihre
  Dimensionen sind die prüfbaren Behauptungen, auf denen diese Stoßrichtung
  beruht — nicht das Vorhaben selbst. Jeder content einer Dimension muss eine
  überprüfbare Markt- oder Zielgruppenbehauptung sein (siehe globale
  Aussagenqualitäts-Regeln), keine Absichts- oder Zielformulierung.
- Der Evidenzstatus jeder Dimension leitet sich aus dem Analysebild ab: Baut die
  Dimension auf übernommenen FACTs auf → ASSUMPTION mit Verweis darauf in der
  justification; baut sie auf OPEN_QUESTIONs auf → OPEN_QUESTION. Verwende
  NIEMALS "FACT" als evidenceStatus — auch wenn die Aussage auf Fakten aus
  Phase 1 basiert, ist sie in einer neuen Option immer ASSUMPTION.
- Die Dimension OPT_TARGET_GROUP adressiert GENAU EIN Zielgruppensegment aus
  dem Analysebild und benennt es explizit über dessen segmentLabel. Der content
  hat die Aussageform "Diese Option adressiert das Segment '{Label}' mit dem
  Fokus ..." plus die strategische Zuspitzung (was diese Option an dem Segment
  enger fasst oder besonders betont). NUR diese Dimension erhält im JSON das
  Feld segmentLabel — der Wert muss EXAKT einem segmentLabel der
  TARGET_SEGMENT-Statements aus dem Kontext entsprechen (nicht umformulieren).
  Enthält der Kontext keine TARGET_SEGMENT-Statements mit segmentLabel, bleibt
  das Feld null.
- Nutze die Profilaspekte des adressierten Segments gezielt: REACHABILITY
  informiert OPT_MARKET_ACCESS, WILLINGNESS_TO_PAY informiert
  OPT_REVENUE_GROWTH, PROBLEM_NEED informiert OPT_CUSTOMER_PROBLEM. Verweise
  in den justifications auf die konkreten Profilaussagen.
- OPT_MARKET_ACCESS ist eine strategische Festlegung mit Begründung (welcher
  Kanal prioritär, warum dieser zuerst, was das für den Ressourceneinsatz
  bedeutet) — keine Paraphrase der REACHABILITY-Profilaussage und keine
  Handlungsaufforderung, sondern ein prüfbarer Aussagesatz (z. B. "Der
  prioritäre Marktzugang erfolgt über X, weil ...").
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
          "evidenceStatus": "ASSUMPTION | OPEN_QUESTION (niemals FACT)",
          "origin": "AI_DERIVATION (immer, kein anderer Wert)",
          "justification": "string (mit Bezug auf das Analysebild)",
          "uncertainty": "string | null",
          "segmentLabel": "string | null (NUR bei OPT_TARGET_GROUP: exakt ein segmentLabel aus dem Kontext; sonst null)"
        }
      ]
    }
  ]
}`;
