// Feedback-based revision of ONE task elaboration (GLOBAL_PROMPT rules apply).
export const TASK_ELABORATION_REFINE_PROMPT = `AUFGABE: Überarbeite GENAU DIESES Arbeitspaket (aktuelleAusarbeitung)
gemäß dem aktuellen Nutzerfeedback (nutzerFeedback). Erfinde kein neues,
unabhängiges Arbeitspaket — es geht um eine gerichtete Überarbeitung des
bestehenden Vorschlags.

REGELN:
- Das Erfolgskriterium der Aufgabe (aufgabe.erfolgskriterium) bleibt inhaltlich
  gewahrt und konsistent zu den Kennzahlen der Maßnahmenkarte
  (massnahmenkarte.kennzahlen). Führe keine neuen Metriken ein.
- Halte den Ressourcenrahmen aus dem Start-up-Profil (startupKontext) ein:
  Budget, Teamgröße, Zeit, Fähigkeiten. Passe zeitaufwandGeschaetzt, tools
  und budgetanteil an, wenn das Feedback Ressourcen betrifft.
- Targeting-Angaben operationalisierst du weiterhin NUR aus den referenzierten
  übernommenen Aussagen (targetingGrundlage). Erfinde keine neuen Zielgruppen,
  Kanäle oder Positionierungen. basiertAufAussageIds müssen auf echte IDs aus
  targetingGrundlage verweisen.
- Die Prüfung der kritischen Annahme (massnahmenkarte.gepruefteAnnahme) bleibt
  der Bezugsrahmen — ändere nicht, WOZU die Aufgabe beiträgt, nur WIE sie
  umgesetzt wird (sofern das Feedback das verlangt).
- previousFeedbackRounds enthält frühere Nutzeranweisungen mit der jeweiligen
  changeSummary. Respektiere ALLE bisherigen Anweisungen weiterhin, sofern das
  aktuelle Feedback sie nicht ausdrücklich aufhebt.
- Schreibe ausschließlich vollständige, assertive deutsche Sätze. Keine
  Stichworte, keine Platzhalter.
- Behalte das gleiche JSON-Schema wie bei der Erstausarbeitung (siehe
  aktuelleAusarbeitung als Referenz). schritte: 3–5 Einträge.
- changeSummary: 1–2 Sätze, was gegenüber der bisherigen Ausarbeitung geändert
  wurde und warum.

AUSGABEFORMAT (JSON, exakt dieses Schema — alle Felder der Ausarbeitung PLUS
changeSummary):
{
  "einleitungssatz": "string",
  "schritte": [
    { "titel": "string", "beschreibung": "string" }
  ],
  "targeting": {
    "vorhanden": "boolean",
    "spezifikation": { ... },
    "basiertAufAussageIds": ["string"],
    "hinweis": "string"
  },
  "formulierungsvorschlaege": ["string"],
  "erfolgskriterium": "string",
  "benoetigteRessourcen": {
    "zeitaufwandGeschaetzt": "string",
    "tools": ["string"],
    "budgetanteil": "string | null"
  },
  "offeneFragen": ["string"],
  "changeSummary": "string (1–2 Sätze: was geändert wurde und warum)"
}

Hinweis targeting.vorhanden = false → nur "vorhanden": false senden.
formulierungsvorschlaege und offeneFragen dürfen leere Arrays sein.
COPY-REGELN für formulierungsvorschlaege gelten unverändert (werbliche
Textbausteine, 2–3 bei kommunikationsbezogenen Aufgaben, spezifisch aus
copyBasis/targetingGrundlage).`;
