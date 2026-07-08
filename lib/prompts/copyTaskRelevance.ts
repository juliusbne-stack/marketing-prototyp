// Shared task-role rules for formulierungsvorschlaege (elaboration + copy refine).
export const COPY_TASK_RELEVANCE_PROMPT = `AUFGABEN-RELEVANZPRÜFUNG (immer zuerst für "formulierungsvorschlaege"):
Prüfe anhand von aufgabe, massnahmenkarte und aufgabenReihenfolgeImSchritt, welche
Rolle die aktuelle Aufgabe hat. Wähle genau eine Rolle:

- COPY_CREATION: Die Aufgabe verlangt neue außenwirksame Texte oder Inhalte
  (z. B. Posts erstellen, Captions schreiben, Landingpage-Hooks entwerfen).
- COPY_ADAPTATION: Die Aufgabe nutzt bestehende Inhalte und passt sie nur an
  Kanal, Format, CTA oder Länge an (z. B. Ads schalten, Texte für Anzeigenformat
  kürzen, CTA ergänzen, Testvarianten ableiten).
- OPERATIONAL: Die Aufgabe betrifft Setup, Schaltung, Budget, Timing, Zielgruppe,
  Messung oder Auswertung und benötigt keine neue Werbebotschaft.

Hilfssignale für die Rollenwahl:
- vorherigeAufgaben mit formulierungsvorschlaege → spätere Aufgaben zu Schaltung,
  Veröffentlichung oder Messung sind fast immer COPY_ADAPTATION oder OPERATIONAL,
  NICHT COPY_CREATION.
- Titel/Unterzeile mit „schalten“, „Budget“, „Tracking“, „auswerten“, „einrichten“,
  „veröffentlichen“, „verteilen“ → eher COPY_ADAPTATION oder OPERATIONAL.
- Titel/Unterzeile mit „erstellen“, „formulieren“, „schreiben“, „entwerfen“,
  „Captions“, „Posts“, „Texte“ → eher COPY_CREATION.

VERHALTEN NACH ROLLE:

COPY_CREATION:
- Erzeuge 2–3 konkrete, glaubwürdige Formulierungsvorschläge (siehe Qualitätsregeln).
- Nur bei der ERSTEN Copy-Aufgabe im Schritt oder wenn noch keine vorherige Aufgabe
  außenwirksame Texte erzeugt hat.

COPY_ADAPTATION:
- Erzeuge KEINE komplett neue Markenbotschaft und KEINE parallelen Post-Texte.
- Baue ausschließlich auf vorherigeAufgaben[].formulierungsvorschlaege und copyBasis auf.
- Gib 2–3 Anpassungen zurück: CTAs, Primary-Text-Fassungen, Headlines oder kurze
  Testvarianten — keine neuen Kernbotschaften.
- Wenn vorherige Copy vorliegt: beziehe dich explizit darauf (sinngemäß übernehmen,
  kürzen, CTA ergänzen). Nicht erneut komplett neu schreiben.

OPERATIONAL:
- Erfinde keine neuen Werbetexte oder Marketing-Claims.
- Gib 2–3 kurze Handlungsanweisungen zurück, wie vorhandene Copy verwendet werden soll.
- Beispiele für den Stil (kontextbezogen formulieren, nicht wörtlich kopieren):
  - „Bestehende Post-Copy aus Aufgabe 1 übernehmen und nur CTA ergänzen.“
  - „Keine neue Botschaft erstellen; die drei Postvarianten gegeneinander testen.“
  - „Anzeigen auf Basis der bereits erstellten Inhalte schalten und Budget
    gleichmäßig verteilen.“
- Beziehe dich auf konkrete vorherige Aufgaben oder deren formulierungsvorschlaege.

Nur leeres Array [] wenn die Aufgabe weder Copy erzeugt noch nutzt noch
operativ darauf Bezug nimmt (rein internes Setup ohne Content-Bezug).

REIHENFOLGE UND REDUNDANZ:
- Wenn frühere Aufgaben im Schritt bereits Posts, Captions, Landingpage-Texte oder
  Anzeigentexte erzeugt haben, dürfen spätere Aufgaben diese Inhalte NICHT neu
  erfinden — nur anpassen (COPY_ADAPTATION) oder Nutzung erklären (OPERATIONAL).
- Vermeide Redundanz: Nicht für Schaltung, Veröffentlichung oder Messung erneut
  dieselbe Art von Werbetexten generieren.
- Bei Ad-Schaltung, Veröffentlichung oder Distribution: keine neuen
  Produktversprechen, die nicht bereits im Kontext oder in der vorherigen Copy
  enthalten sind.`;

export const COPY_QUALITY_PROMPT = `QUALITÄTSREGELN (für COPY_CREATION und COPY_ADAPTATION):
- Kurz, konkret, natürlich — wie ein echtes kleines Start-up, nicht wie Agentur oder KI.
- Mindestens ein konkreter Bezug aus copyBasis, Aufgabe oder vorheriger Copy.
- Keine Marketingfloskeln, keine erfundenen Fakten, keine künstlichen Wortspiele.
- Vermeide: „Entdecke …“, „innovativ“, „einzigartig“, „stilvoll“, „nachhaltig“ ohne
  Konkretisierung, Superlative, unnötige Ausrufezeichen.
- Claims (lokal, fair produziert, Preise, Nachhaltigkeit) nur wenn im Kontext.
- Keine Städtenamen nur für lokalen Klang.
- Kanal aus copyBasis.kanal beachten (z. B. Instagram Primary Text max. 125 Zeichen).

Selbstcheck vor Ausgabe:
- Passt die Variante zur Aufgabenrolle?
- Könnte sie für 100 andere Start-ups passen?
- Erfindet sie Copy neu, die vorherige Aufgaben bereits geliefert haben?
Wenn ja → neu schreiben.`;
