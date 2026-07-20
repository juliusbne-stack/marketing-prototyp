# UI-Konzept

Gestaltungsleitfaden für den Prototyp. Ziel: ein ruhiges, vertrauenswürdiges Arbeitswerkzeug, dessen visuelles Markenzeichen die **durchgängige Evidenzkennzeichnung** ist — jede Aussage trägt sichtbar ihren Status, und der Unterschied zwischen „KI-Entwurf" und „übernommenem Arbeitsstand" ist auf einen Blick erkennbar. Keine Marketing-Ästhetik, kein Dashboard-Kitsch: Das UI soll wie ein präzises Denkwerkzeug wirken.

## 1. Design-Tokens

### Farben (in `globals.css` als CSS-Variablen + Tailwind-Theme)
| Token | Wert | Verwendung |
|---|---|---|
| `--background` | `#FAFAF7` | Seitenhintergrund (warmes Off-White) |
| `--surface` | `#FFFFFF` | Karten, Panels |
| `--border` | `#E4E2DC` | Standard-Rahmen |
| `--text` | `#1F2421` | Primärtext |
| `--text-muted` | `#6B7069` | Sekundärtext, Begründungen |
| `--brand-dark` | `#14231E` | Sidebar, Hero-Panel, Buttons aktiv (dunkles Tannengrün) |
| `--accent` | `#0F8C74` | Primärgrün: Buttons, Links, Fortschrittsbalken, aktive Phase |
| `--accent-bright` | `#14B394` | Helles Smaragdgrün (Gradient-Endpunkt) |
| `--accent-deep` | `#0B6E5B` | Dunkles Grün: Text auf hellen Badges, Phasen-Label |
| `--accent-mint` | `#7FE0C9` | Mintgrün: Akzente auf dunklem Grund, „Mehr erfahren“ |
| `--accent-soft` | `#E3F2EC` | Helles Mint: Badge-Hintergründe, aktive Elemente |
| `--accent-border` | `#BFE3D8` | Zartes Mint: Karten-Border bei Hover |
| **Evidenz: Fakt** | Text `#0F6E56`, BG `#E1F5EE`, Border `#1D9E75` | grün |
| **Evidenz: Annahme** | Text `#854F0B`, BG `#FAEEDA`, Border `#BA7517` | amber |
| **Evidenz: Offene Frage** | Text `#3C3489`, BG `#EEEDFE`, Border `#7F77DD` | violett |
| Gefahr/Widerlegt | Text `#A32D2D`, BG `#FCEBEB` | nur Phase 5 (widerlegte Annahmen) |

Regel: Die drei Evidenzfarben sind für nichts anderes reserviert. Der Marken-Grünakzent kollidiert bewusst mit keiner davon.

### Typografie (via `next/font/google`)
- **Headings:** Space Grotesk (500/600) — Projektname, Phasentitel, Kartentitel
- **Body/UI:** Inter (400/500) — alles andere
- Größen: Phasentitel 22px, Abschnittstitel 16px/500, Body 14px, Badges/Meta 12px

### Sonstiges
- Radius: 10px Karten, 6px Buttons/Badges, Badges als Pille (voll gerundet)
- Schatten: keine bis minimal (`shadow-sm` max) — Struktur über Rahmen, nicht Schatten
- Abstände großzügig: Karten-Padding 16px, Abschnitte 32px Abstand

## 2. Grundlayout

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠ Prototyp: Alle Recherche- und Marktdaten sind fiktiv.      │  ← Banner, immer sichtbar, amber-BG
├────────────┬─────────────────────────────────────────────────┤
│            │  Projektname                        [Phase 1/5] │  ← Projekt-Header
│  STEPPER   ├─────────────────────────────────────────────────┤
│            │                                                 │
│ ●1 Analyse │   Phasentitel + 1 Satz Erklärung                │
│ ○2 Optionen│                                                 │
│ ○3 Bewert. │   [ Phaseninhalt: Formulare / Ergebnisraster ]  │
│ ○4 Umsetz. │                                                 │
│ ○5 Lernen  │   ───────────────────────────────────────────  │
│            │   [Primäraktion der Phase]        [Weiter →]    │
└────────────┴─────────────────────────────────────────────────┘
```

- **Stepper (Sidebar, 240px):** 5 Einträge mit Nummer, deutschem Titel, Status-Punkt (● aktiv = Primärgrün, ✓ abgeschlossen = grün-gefüllt, ○ offen = grau). Abgeschlossene Phasen sind klickbar (Rücksprung, F11). Offene Phasen sind gesperrt, bis die Vorphase mindestens einen übernommenen Arbeitsstand hat. Mobil: Stepper als horizontale Leiste oben.
- **Prototyp-Banner:** dünner amber Balken ganz oben, Text: „Prototyp — alle Recherche- und Marktdaten werden zu Demonstrationszwecken von der KI simuliert und sind fiktiv." Nicht schließbar (NF9/Transparenz).
- Hauptbereich: `max-width: 960px`, zentriert.

## 3. Kernkomponente: StatementCard (überall wiederverwendet)

```
┌───────────────────────────────────────────────────────────┐
│ [● Annahme ▾]                        [👤 Nutzer]  ✎  🗑    │  ← Badge (klickbar!) + Herkunft + Aktionen
│ Berufstätige 25–45 in Großstädten buchen Kurse spontan     │
│ und bevorzugen App-Buchung mit Sofortbestätigung.          │
│ ─────────────────────────────────────────────────────────  │
│ Begründung: Aus Nutzungskontext und Wettbewerbsangeboten   │  ← text-muted, 13px
│ abgeleitet. Quelle: „Studio-Booking-Trends 2025 (fiktiv)"  │
│ Unsicher: tatsächliches Buchungsverhalten ungeprüft        │
└───────────────────────────────────────────────────────────┘
```

- **EvidenceBadge:** Pille mit Punkt + Label („Fakt" / „Annahme" / „Offene Frage") in den Evidenzfarben. Klick öffnet kleines Dropdown zum Umstufen (F5/NF2 — die manuelle Änderbarkeit ist Kernfeature, kein Nice-to-have).
- **OriginTag:** dezentes Icon + Label rechts oben: `User`-Icon „Nutzer", `Search`-Icon „Recherche (fiktiv)", `Sparkles`-Icon „KI-Ableitung" (lucide-react).
- **Begründung/Quelle/Unsicherheit:** eingeklappt auf eine Zeile mit „Mehr"-Toggle, wenn lang.
- **Entwurfszustand (adopted=false):** gestrichelter Rahmen + sehr heller Mint-Hintergrund (`accent-soft`) + kleines Label „Entwurf" + Button „Übernehmen" (Häkchen). **Übernommen (adopted=true):** solider Rahmen, weißer Hintergrund. Dieser sichtbare Zustandswechsel IST das Übernahme-Prinzip (F10/NF5) — bitte exakt so umsetzen.
- Inline-Bearbeitung des Inhalts über ✎ (Textarea in der Karte, Speichern/Abbrechen).

## 4. Phasenansichten

### Phase 1 — Situationsanalyse
1. **Profil-Onboarding (ProfileOnboardingWizard)** — bei neuen Projekten (`profileOnboardingComplete=false`): geführtes 12-Schritte-Interview in 3 Kapiteln (Angebot · Markt & Kunden · Ressourcen), eine Frage pro Screen, ein Kapitel-Hinweis auf der ersten Frage jedes Kapitels (z. B. „In diesem Kapitel kannst du Annahmen machen — die Analyse prüft sie später."), Live-Vorschau des Start-up-Profils rechts (Desktop) bzw. aufklappbar (Mobil), Fortschrittspunkte, „Später klären" für optionale Felder (violetter „Offen"-Chip in der Vorschau), Kapitel-Abschluss nach Frage 3/7, Abschluss-Morph in die Profil-Karte. Inkrementelles Speichern nach jedem Schritt (`profileOnboardingStep`). Nur Geschäftsidee ist Pflicht.
2. **Eingabeformular (ProfileForm)** — nach abgeschlossenem Onboarding oder bei Bestandsprojekten: 2-spaltig, dieselben Felder wie im Interview, editierbar. Primärbutton **„Analyse erstellen"** → Ladezustand (Skeleton-Karten + Text „Die KI erstellt einen Analyse-Entwurf mit simulierten Recherchedaten …").
3. **Ergebnis in 4 Abschnitten** (untereinander, mit Anker-Navigation):
   - **PESTEL-Raster:** 6 Felder im 3×2-Grid, Kategorie-Titel + StatementCards
   - **Zielgruppen & Kundenprobleme:** Segment-Karten nebeneinander (2–4), darunter Problem-Statements
   - **Wettbewerb & Alternativen:** Kompakte Akteursliste (aufklappbar, Typ + Preis in der Zeile) + aufklappbare Landschafts-Aussagen
   - **SWOT-Matrix:** klassisches 2×2 (Stärken | Schwächen / Chancen | Risiken), Quadranten dezent getönt, darin StatementCards; darunter „Erkennbare Marktpfade" als Liste
4. Kopfzeile des Ergebnisses: **Evidenz-Zusammenfassung** („12 Fakten · 18 Annahmen · 6 offene Fragen") + Button „Alle Entwürfe übernehmen" + je Karte einzeln übernehmbar. „+ Aussage hinzufügen" in jedem Abschnitt (manuelle Statements, origin=USER_INPUT).

### Phase 2 — Strategieoptionen
- Button „Optionen entwickeln" → 2–3 **OptionCards nebeneinander** (Grid, mobil untereinander).
- OptionCard: Titel, Kurzbeschreibung, dann 6 Dimensionszeilen (Label links: Zielgruppe, Kundenproblem, Nutzenversprechen, Positionierung, Marktzugang, Erlös-/Wachstumslogik; rechts die StatementCard kompakt). Fußzeile: Mini-Evidenzbilanz der Option („1 Fakt-gestützt · 4 Annahmen · 1 offen").
- Unter der Zielgruppen-Dimension (wenn das Statement ein segmentLabel trägt): aufklappbarer, schreibgeschützter Bereich **„Segmentprofil: {Label}"** (standardmäßig zugeklappt). Beim Aufklappen werden die übernommenen Profil-Statements dieses Segments live aus Phase 1 geladen und als kompakte Aspekt-Zeilen mit aktuellen Evidenz-Badges gezeigt (Badges hier NICHT klickbar — keine Duplikation, Phase 1 bleibt die einzige Quelle). Fußnote: „Quelle: Situationsanalyse — Änderungen dort vornehmen" mit Link zum Zielgruppen-Abschnitt von Phase 1. Ohne segmentLabel (Altbestand) entfällt der Bereich.
- Bewusst KEINE Bewertungselemente in dieser Phase (Modelltreue: Bewertung erst in Phase 3).

### Phase 3 — Bewertung & Priorisierung
- **EvaluationMatrix:** Tabelle, Zeilen = 6 Kriterien (deutsche Labels: Attraktivität, Ressourcenpassung, Tragbares Risiko, Prüfaufwand, Lernwert, Evidenzstärke), Spalten = Optionen. Zelle: Score als 5-Punkte-Leiste + Info-Icon mit Begründung (Popover/Details).
- Darunter **PrioritizationPanel:** Primärgrün-umrandete Karte „Priorisierungsvorschlag der KI" mit Begründung UND „Was dagegen sprechen könnte" (eigener Absatz — NF5!). Zwei Aktionen: **„Vorschlag übernehmen"** und **„Andere Option priorisieren"** (Auswahl + Pflichtfeld eigene Begründung). Zurückgestellte Optionen erscheinen darunter ausgegraut mit Label „Zurückgestellt — bleibt verfügbar".

### Phase 4 — Validierende Umsetzung
- Kopf: die priorisierte Option kompakt zusammengefasst.
- **Kritische Annahmen:** Liste der 2–4 markierten Statements (mit Badge), je Annahme darunter die zugehörige **ValidationStepCard**: Titel, Beschreibung, Kanal-Chip, Metriken als Zweispalter („✓ Stützend wenn: …" grün / „✗ Widerlegend wenn: …" rot-getönt). Entwurf/Übernahme wie überall.

### Umsetzungs-Cockpit (Begleitansicht zwischen Phase 4 und 5)
- Eigener, abgesetzter Stepper-Eintrag unterhalb der fünf Phasen (Gauge-Icon, „Umsetzungs-Cockpit"). Aktiv, sobald mindestens ein Umsetzungsschritt übernommen ist; sonst ausgegraut mit Tooltip.
- Kopf: priorisierte Option + Evidenzbilanz ihrer Dimensionen („x Fakten · y Annahmen · z offene Fragen").
- Je übernommenem Schritt eine Karte mit drei Bereichen:
  - **Aufgaben:** Checkbox-Liste (KI-generiert über „Aufgaben mit KI erstellen", 3–7 chronologische Aufgaben mit Praxistipp), Fortschritts-Chip „3/6", Häkchen persistieren sofort.
  - **Kennzahlen (fiktiv):** je Metric der letzte KpiDataPoint als Wert-Chip, darunter die Historie als kleine Punktreihe. Eingabe nur über Szenario-Chips (Stützend/Gemischt/Widersprechend) + „Kennzahlen simulieren"; neue Punkte werden angehängt.
  - **Fußzeile:** „Kennzahlen als Rückmeldung übernehmen" (nur aktiv mit Datenpunkten) — legt LLM-frei per Template ein MarketFeedback als Entwurf für Phase 5 an; die Auswertung bleibt beim Nutzer.
- **KPI-Farben (eigene Tokens, NICHT die reservierten Evidenzfarben):** stützend Text `#2F6B33` / BG `#EAF4E5`, widersprechend Text `#9A3B1F` / BG `#FDEEE6`, neutral über `border`/`background`/`text-muted`.
- Statusanzeigen: Phase 4 zeigt auf ValidationStepCards einen dezenten Chip „Aufgaben 3/6"; Phase 5 bietet am FeedbackForm den Hinweis-Link „Kennzahlen aus dem Cockpit übernehmen", falls Datenpunkte existieren.

### Phase 5 — Lernen & Anpassung
- Je ValidationStep ein **FeedbackForm**: Textarea „Was ist passiert? (fiktive Rückmeldung eintragen)" + Speichern.
- Button „Rückmeldungen auswerten" → **EvidenceUpdateList:** je Annahme eine Zeile mit Vorher→Nachher-Badge (z. B. `● Annahme → ● Fakt` oder `● Annahme → ● Offene Frage`), Ergebnis-Chip (Gestützt/Teilweise/Widerlegt/Mehrdeutig), KI-Interpretation, Button „Statusänderung übernehmen".
- **AdaptationPanel:** Vorschlag der KI (CONTINUE/ADAPT/DEFER/DISCARD/LOOP_BACK, deutsch: Fortführen/Anpassen/Zurückstellen/Verwerfen/Zurück zu Phase X) + Begründung; Nutzer wählt final per Radio-Auswahl + Bestätigen. Bei „Zurück zu Phase X": Link springt in die Phase (Rückkopplung sichtbar machen).

## 5. Zustände & Mikrotexte
- **Laden:** Skeleton-Karten + je Phase eigener Satz („Die KI vergleicht die Optionen anhand der sechs Kriterien …"). Dauer 10–30 s ist ok — Fortschrittsgefühl über Skeletons.
- **Leer:** jede Phase erklärt sich selbst („In dieser Phase entstehen aus deinem Analysebild 2–3 vergleichbare Strategieoptionen. Starte mit ‚Optionen entwickeln'.").
- **Fehler:** konkret + Lösungsweg („Die KI-Antwort konnte nicht verarbeitet werden. Erneut versuchen — deine Eingaben bleiben erhalten."). Kein Apologetik-Ton.
- **Buttons benennen, was passiert:** „Analyse erstellen", „Optionen entwickeln", „Bewertung starten", „In Projektstand übernehmen", „Statusänderung übernehmen". Nie „Absenden"/„OK".
- Durchgängig: Wo simulierte Recherche einfließt, steht „(fiktiv)" direkt an der Quelle — zusätzlich zum globalen Banner.

## 6. Qualitätsfloor
Responsiv bis Mobil (Stepper wird horizontale Leiste, Options-Grid bricht um), sichtbarer Tastaturfokus (Primärgrün-Ring), Kontraste AA (die angegebenen Text-auf-BG-Paare erfüllen das), `prefers-reduced-motion` respektieren (ohnehin kaum Animation — nur sanfte Übergänge beim Entwurf→Übernommen-Wechsel).
