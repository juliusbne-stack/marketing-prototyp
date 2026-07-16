// Shared validation-core rules for Phase 4 prompts (initial, scale, refine).
// Keeps assumption → test design → activities → metrics logic consistent.

export const VALIDATION_CORE_THINKING = `VALIDIERUNGSKERN — strikte Reihenfolge (PFLICHT):
1. Was behauptet die Annahme genau? (validationCore.claim im Kontext)
2. Welche Beobachtung könnte diese Behauptung stützen oder widerlegen?
3. Welche Testmethoden können diese Evidenz erzeugen? (interne Kandidaten im Kontext)
4. Welche Methode ist unter den Nutzerbedingungen umsetzbar? (nutzerbedingungen)
5. Welche Aktivitäten sind für diesen Test erforderlich?
6. Welche Metrik entscheidet über das Ergebnis? (EvidenceContract)
7. Ist die gesamte Kette fachlich konsistent?

VERBOTEN: Zuerst einen Kanal wählen und nachträglich Metriken formulieren.
strategyDimension ist nur fachliche Einordnung — sie bestimmt NICHT allein den Prüfgegenstand.
Nutze primaryTestSubject und ausgewaehlterTestansatz aus annahmenPlanung.

ANNAHMENBEZUG (PFLICHT je Whitelist-Eintrag):
- validationQuestion UND testDesign MÜSSEN aus validationCore und der Unsicherheit abgeleitet werden.
- Die Prüffrage muss den Aussagekern prüfen — nicht nur Erreichbarkeit oder einen Kanal.
- „Keine eigene Social-Media-Reichweite" bedeutet NICHT „Social Media ausgeschlossen".
  Dann externen Verbreitungsweg auf den eigenen Profil- oder Vertriebskanälen benennen
  (bestehende Community dort, Direktansprache, Partner/Multiplikator/Influencer/Kooperation/Creator,
  bezahlte Ausspielung/Ads/Anzeigen auf verfügbaren Plattformen).
  „Community" ist KEIN Freifahrschein für neue fremde Plattformen.
- Keine interne Prozesssprache (kein „Fallback", „ersetzt", „die KI hat gewählt").`;

export const SIGNAL_CATEGORY_RULES = `SIGNAL-PASSUNG (PFLICHT — jeder Messpunkt erhält genau eine signalCategory):

Kategorisierung:
- COMMITMENT: Vorbestellung, Anzahlung, Kauf, Warteliste mit Zahlungsdaten,
  verbindliche Kaufzusage nach Preisansicht
- BEHAVIOR: Conversion Rate, CTR auf preisführende Anzeige, Cost per qualified Visit,
  Registrierung, Wiederkehrrate, Abbruchquote
- ATTENTION: Impressions, Reichweite, Engagement-Rate, Likes, Views, Follower
- QUALITATIVE: Interviewaussagen, strukturierte Kommentaranalyse, offenes Feedback

Für den ENTSCHEIDENDEN Messpunkt (metricRole DECISIVE) je nach testSubject:
- WILLINGNESS_TO_PAY → nur COMMITMENT
- REACHABILITY → nur BEHAVIOR
- PROBLEM_RELEVANCE → QUALITATIVE oder BEHAVIOR
- VALUE_UNDERSTANDING → BEHAVIOR oder QUALITATIVE
- DIFFERENTIATION → BEHAVIOR oder QUALITATIVE
- REVENUE_MECHANICS → COMMITMENT oder BEHAVIOR
- OTHER → alles außer ATTENTION

ATTENTION ist NIEMALS entscheidend — in keinem Modus, für keinen testSubject.
Begründung: Kennzahlen müssen zur angenommenen Wirkungslogik der geprüften Aussage passen.
Reichweite belegt nicht Zahlungsbereitschaft. Aufmerksamkeit ist notwendig, aber nie hinreichend.
Unterstützende Messpunkte (SUPPORTING) dürfen jede Kategorie haben, auch ATTENTION.`;

export const ASSUMPTION_TYPE_VALIDATION_MAP = `ANNAHMENTYP → PRÜFLOGIK (gleichrangig — keine Vorabgewichtung):
- Zahlungsbereitschaft / Preis / €: Validierungskern = messbare Kaufabsicht nach sichtbarem Preis.
  Entscheidend: COMMITMENT-Signale (Warteliste, Vorbestellung, Kaufzusage nach Preisansicht).
- Erreichbarkeit / Marktzugang: Validierungskern = Zielgruppe reagiert qualifiziert über den Kanal.
  Entscheidend: BEHAVIOR (CTR auf preisführende Anzeige, qualifizierte Anfragen, Conversion).
- Problemrelevanz: Validierungskern = Problem ist real und spürbar.
  Entscheidend: QUALITATIVE oder BEHAVIOR (Interview-Bestätigungsrate, Pain-Signale).
- Nutzenverständnis / Positionierung: Validierungskern = Nutzen kommt an und wird verstanden.
  Entscheidend: BEHAVIOR oder QUALITATIVE (Verständnis, Relevanz-Bewertung).
- Differenzierung: Entscheidend: BEHAVIOR oder QUALITATIVE (Vergleichspräferenz).
- Erlösmechanik: Entscheidend: COMMITMENT oder BEHAVIOR (Preissignale, Conversion).
- Zielgruppe: Entscheidend: BEHAVIOR oder QUALITATIVE (Segment-Treffer, qualifizierte Gespräche).`;

export const CRITERION_THRESHOLD_RULES = `SCHWELLENWERTE IN ERFOLGSKRITERIEN (Stützend/Widerlegend — PFLICHT):
- Jeder Schwellenwert MUSS sich auf eine Bezugsgröße beziehen, die der gewählte
  Test-Kanal messbar erzeugt (z. B. erreichte Personen/Reichweite, Story-Views,
  Link-Klicks, Registrierungen, Einlösungen).
- VERBOTEN sind Bezugsgrößen, die das Start-up in dieser Phase nicht kennt oder
  die der Test nicht erzeugt — insbesondere die abstrakte Gesamt-Zielgruppe bzw.
  Marktgröße („% der Zielgruppe").
- Die Bezugsgröße MUSS im Kriteriumstext explizit ausgeschrieben werden
  (z. B. „über 2 % der durch die Kampagne erreichten Personen lösen den Code ein"),
  nicht implizit gelassen.
- Die Bezugsgröße muss zur Kennzahl-Definition passen: Ist die Kennzahl eine
  „Conversion Rate", ist der Nenner die erreichte/klickende Menge, nicht die
  Gesamt-Zielgruppe.
- Stützendes und widerlegendes Kriterium MÜSSEN dieselbe Bezugsgröße verwenden.
- Ist keine messbare relative Bezugsgröße sinnvoll bestimmbar, formuliere das
  Kriterium in absoluten Zahlen (z. B. „mindestens N Einlösungen bei einer
  Reichweite von mind. M") statt in Prozent auf unbekanntem Nenner.`;

export const METRIC_ROLE_RULES = `MESSLOGIK (PFLICHT):
- Jeder Schritt braucht mindestens EINE entscheidende Metrik (metricRole: DECISIVE),
  die die geprüfte Annahme direkt adressiert und die Signal-Passungsregeln erfüllt.
- 0–2 unterstützende Metriken (metricRole: SUPPORTING) sind optional.
- Wenn nur ATTENTION als entscheidendes Signal möglich wäre, wähle ein anderes Testdesign.
- Jede Metrik benötigt valueType (SCALAR | COUNT | COUNT_OF_TOTAL | PERCENTAGE |
  CURRENCY | DURATION | SCORE) und aggregationStrategy (SUM | LATEST | AVERAGE |
  RATE_FROM_SUMS | NONE). evaluationMode beschreibt nur PER_POINT oder CUMULATIVE
  und ersetzt diese Angaben nicht.
- COUNT_OF_TOTAL und Conversion-Raten verwenden RATE_FROM_SUMS. Sie benötigen je
  Erhebungswelle getrennte Treffer und Beobachtungen; Prozentwerte werden nie addiert.
- Jede technisch bewertbare Metrik benötigt evaluationConfig mit kind,
  success/failure ({ operator: GTE | GT | LTE | LT | EQ und genau einem von
  value, numerator, ratio, percentage }) sowie bei Stichproben
  requiredDenominator. Die Kriteriumstexte bleiben für Menschen verständlich,
  werden aber nicht maschinell geparst.
- Für COUNT_OF_TOTAL außerdem numeratorLabel, denominatorLabel und eine neutrale
  observationUnit für die Anzeige angeben.`;

export const METRIC_EFFECT_LOGIC_RULES = `WIRKUNGSLOGIK JE METRIK (PFLICHT für DECISIVE):
- Jede entscheidende Metrik (metricRole: DECISIVE) braucht proxyStrength und signalRationale.
- proxyStrength PROXY = das Signal belegt die Annahme nur MITTELBAR.
  Merksatz: Anmeldung/Registrierung/Klick/Interesse-Bekundung ist ein PROXY für tatsächliche
  Nutzung oder Zahlung, kein direkter Beleg.
- proxyStrength DIRECT nur bei unmittelbarem Beleg der IN DER UNCERTAINTY BENANNTEN Sache
  (z. B. tatsächliche aktive Nutzung für Nutzungsbereitschaft, tatsächliche Zahlung für
  Zahlungsbereitschaft).
- signalRationale: 1–2 Sätze, WARUM dieses Signal die konkrete Unsicherheit der Annahme
  (content/justification/uncertainty aus der Whitelist) stützt oder widerlegt.
- Prüfgegenstand-Treue: signalRationale und Signalwahl müssen die in uncertainty benannte
  Unsicherheit treffen. Wenn uncertainty „Nutzung" oder „Bereitwilligkeit zur Nutzung" sagt,
  ist „Verständnis" oder „Interesse" NICHT dasselbe — dann ist ein Verständnis-/Interesse-
  Signal höchstens PROXY für Nutzung, nicht DIRECT.
- Für SUPPORTING-Metriken sind proxyStrength und signalRationale optional.`;

export const VALIDATION_STEP_OUTPUT_FIELDS = `- validationQuestion: Eine präzise Frage — was muss beobachtet werden?
- testDesign: Kurzbeschreibung des eigentlichen Experiments (nicht nur Kanal).
- strategyDimension: TARGET_GROUP | CUSTOMER_PROBLEM | VALUE_PROPOSITION | POSITIONING | MARKET_ACCESS | REVENUE_GROWTH
- testSubject: WILLINGNESS_TO_PAY | REACHABILITY | PROBLEM_RELEVANCE | VALUE_UNDERSTANDING | DIFFERENTIATION | REVENUE_MECHANICS | OTHER
- title: Kurztitel des Schritts (Testdesign, nicht nur „Ads schalten").
- description: Zusammenfassung: Was wird getestet, welcher Kanal/Aufwand, warum passend.
- marketingActivities: 3–6 konkrete Durchführungsmaßnahmen.`;

export const VALIDATION_MODE_RULES = `MODUS VALIDATION (im Kontext als modus übergeben):
- Wähle 2–4 Annahmen aus der Whitelist. Kritisch = erfolgskritisch UND geringer Evidenzgrad.
- Pro Annahme genau ein Schritt; keine doppelte assumptionId.
- Bei mehr als einem Schritt: mindestens zwei verschiedene strategyDimension-Werte.
  Ein Kanalwechsel ist KEINE neue Annahme — zwei Kanäle für dieselbe Kernfrage sind ein Schritt.
- Enthält die Whitelist nur eine Dimension: diversityNote mit Begründung setzen, keine Annahme erfinden.
- Erfolgskriterien: „gilt als stützend, wenn …" / „gilt als widerlegend, wenn …"`;

export const SCALING_MODE_RULES = `MODUS SCALING (im Kontext als modus übergeben):
- Jeder Schritt bezieht sich auf genau einen gestützten Fakt aus der Whitelist.
- KEINE neuen strategischen Fragen, KEINE ungeprüften Annahmen.
- Skalierung = derselbe Validierungskern, größerer Maßstab (Budget, Reichweite, Laufzeit).
- Leitfrage: „Trägt der gestützte Fakt auch bei größerem Maßstab?" — nicht „Trifft die Annahme zu?"
- Kanalregel: ausschließlich Kanäle aus validatedChannels. Neuer Kanal → modeNote (ADAPT statt CONTINUE).
- Diversitätsregel gilt NICHT — mehrere Schritte auf derselben Dimension sind zulässig.
- Erfolgskriterien: „Skalierung trägt wenn …" / „Skalierungsgrenze erreicht wenn …"`;

export const CHANNEL_SELECTION_RULES = `KANALWAHL (PFLICHT):
- Der Kontext enthält verfuegbareKanaele (Profil-Skills, Fragebogen, priorisierte Strategieoption).
- Bevorzuge Kanäle aus verfuegbareKanaele.kanaele und vertriebskanaele.
- Führe KEINE Plattform ein, die nicht aus Profil-Skills, Fragebogen oder Strategieoption ableitbar ist.
- „Community" meint bestehende Communities auf den eigenen Profil- oder Vertriebskanälen
  (z. B. Instagram-, Vinted- oder Shop-Community) — keine neuen fremden Plattformen.`;
