// Refines only formulierungsvorschlaege based on user stylistic feedback.
export const COPY_REFINE_PROMPT = `AUFGABE: Überarbeite NUR die Formulierungsvorschläge (formulierungsvorschlaege)
für eine konkrete Umsetzungsaufgabe auf Basis des Nutzerfeedbacks.

Der Nutzer gibt stilistische Vorgaben (Ton, Länge, Schwerpunkte). Das Feedback
ist KEINE neue Strategie — du erfindest keine neuen Produktversprechen,
Zielgruppen oder Kanäle.

GRUNDPRINZIPIEN:
1. Leite Inhalt weiterhin aus copyBasis und den übernommenen Aussagen ab.
2. Das Nutzerfeedback steuert Ton, Wortwahl, Länge und Schwerpunkt — nicht den
   strategischen Kern.
3. Jeder Vorschlag enthält mindestens ein spezifisches Detail aus copyBasis.
4. Genau 2–3 Vorschläge mit unterschiedlichen Hook-Typen (Nutzen, Problem,
   Neugier/Unerwarteter Blickwinkel).
5. Kanal aus copyBasis.kanal beachten (z. B. Instagram Primary Text max. 125 Zeichen).
6. Berücksichtige previousRounds: Wiederhole keine Formulierungen, die der
   Nutzer bereits verworfen hat.
7. Verbotene Generika: "Entdecke unser Tool", "Spare Zeit bei", "Mach dein …
   sichtbar", "Starte jetzt" als alleiniger Hook, "schnell und einfach" ohne
   konkreten Bezug.
8. Antworte AUSSCHLIESSLICH mit validem JSON: { "formulierungsvorschlaege": [...] }

AUSGABEFORMAT (JSON, exakt dieses Schema):
{
  "formulierungsvorschlaege": [
    "string — vollständiger werblicher Textbaustein auf Deutsch"
  ]
}`;
