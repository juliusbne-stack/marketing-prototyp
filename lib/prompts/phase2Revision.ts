// Phase 2 revision prompt — reworking the prioritized option after an ADAPT
// decision in phase 5 (learning loop back into option development).
export const PHASE2_REVISION_PROMPT = `AUFGABE: Der Nutzer hat in Phase 5 entschieden, die priorisierte Strategieoption
anzupassen (ADAPT). Überarbeite das Hypothesenbündel der Option auf Basis der
Lernergebnisse: der Feedback-Auswertungen (Ergebnis + Interpretation), der
übernommenen LEARNING-Aussagen und der aktuellen Evidenzstatus der Dimensionen.

REGELN:
- Schlage überarbeitete Fassungen NUR für die Dimensionen vor, die von den
  Lernergebnissen tatsächlich betroffen sind. Keine Anpassung ohne konkreten
  Anlass in den übergebenen Rückmeldungen oder Erkenntnissen.
- revisions: je betroffener Dimension GENAU eine überarbeitete Aussage:
  - content: die überarbeitete Formulierung der Dimension (vollständiger
    Ersatz der bisherigen Aussage, nicht nur ein Änderungshinweis).
  - evidenceStatus: NUR ASSUMPTION oder OPEN_QUESTION — die Überarbeitung ist
    noch nicht am Markt geprüft. Widerlegte Kernpunkte ohne neue belastbare
    Anhaltspunkte → OPEN_QUESTION.
  - justification: MIT explizitem Bezug auf die jeweilige Rückmeldung oder
    Erkenntnis (z. B. "Die Rückmeldung zu ... zeigte, dass ..., daher ...").
  - uncertainty: was an der überarbeiteten Fassung weiterhin unsicher ist.
- unchanged: liste jede NICHT betroffene Dimension mit einer kurzen Begründung
  (reason), warum die Lernergebnisse sie nicht berühren.
- Überarbeitest du OPT_TARGET_GROUP, benennt der content das adressierte
  Zielgruppensegment explizit über dessen segmentLabel in der Aussageform
  "Diese Option adressiert das Segment '{Label}' mit dem Fokus ..." plus die
  strategische Zuspitzung. NUR diese Revision erhält im JSON das Feld
  segmentLabel — der Wert muss EXAKT einem segmentLabel der übergebenen
  Segmentprofile (adoptedSegmentProfiles) entsprechen; bei allen anderen
  Dimensionen bleibt das Feld null. Fehlen Segmentprofile im Kontext, bleibt
  es ebenfalls null.
- Nutze die Profilaspekte des adressierten Segments gezielt: REACHABILITY
  informiert OPT_MARKET_ACCESS, WILLINGNESS_TO_PAY informiert
  OPT_REVENUE_GROWTH, PROBLEM_NEED informiert OPT_CUSTOMER_PROBLEM. Verweise
  in den justifications auf die konkreten Profilaussagen.
- Jede der 6 Dimensionen (OPT_TARGET_GROUP, OPT_CUSTOMER_PROBLEM,
  OPT_VALUE_PROPOSITION, OPT_POSITIONING, OPT_MARKET_ACCESS,
  OPT_REVENUE_GROWTH) erscheint GENAU EINMAL — entweder in revisions oder in
  unchanged.
- Bleibe bei der Stoßrichtung der Option; eine grundlegend neue Option wäre
  ein neuer Durchlauf von Phase 2, nicht deine Aufgabe.

AUSGABEFORMAT (JSON, exakt dieses Schema):
{
  "revisions": [
    {
      "dimensionCategory": "OPT_TARGET_GROUP | OPT_CUSTOMER_PROBLEM | OPT_VALUE_PROPOSITION | OPT_POSITIONING | OPT_MARKET_ACCESS | OPT_REVENUE_GROWTH",
      "content": "string",
      "evidenceStatus": "ASSUMPTION | OPEN_QUESTION",
      "justification": "string (expliziter Bezug auf Rückmeldung/Erkenntnis)",
      "uncertainty": "string | null",
      "segmentLabel": "string | null (NUR bei OPT_TARGET_GROUP: exakt ein segmentLabel aus adoptedSegmentProfiles; sonst null)"
    }
  ],
  "unchanged": [
    {
      "dimensionCategory": "OPT_TARGET_GROUP | ...",
      "reason": "string (kurz, warum nicht betroffen)"
    }
  ]
}`;
