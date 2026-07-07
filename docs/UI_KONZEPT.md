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
| `--accent` | `#0E5A63` | Primäraktionen, aktive Phase, Links (tiefes Petrol) |
| `--accent-soft` | `#E3F0F1` | Hintergrund aktiver Elemente |
| **Evidenz: Fakt** | Text `#0F6E56`, BG `#E1F5EE`, Border `#1D9E75` | grün |
| **Evidenz: Annahme** | Text `#854F0B`, BG `#FAEEDA`, Border `#BA7517` | amber |
| **Evidenz: Offene Frage** | Text `#3C3489`, BG `#EEEDFE`, Border `#7F77DD` | violett |
| Gefahr/Widerlegt | Text `#A32D2D`, BG `#FCEBEB` | nur Phase 5 (widerlegte Annahmen) |

Regel: Die drei Evidenzfarben sind für nichts anderes reserviert. Der Petrol-Akzent kollidiert bewusst mit keiner davon.

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

- **Stepper (Sidebar, 240px):** 5 Einträge mit Nummer, deutschem Titel, Status-Punkt (● aktiv = Petrol, ✓ abgeschlossen = grün-gefüllt, ○ offen = grau). Abgeschlossene Phasen sind klickbar (Rücksprung, F11). Offene Phasen sind gesperrt, bis die Vorphase mindestens einen übernommenen Arbeitsstand hat. Mobil: Stepper als horizontale Leiste oben.
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
- **Entwurfszustand (adopted=false):** gestrichelter Rahmen + sehr heller Petrol-Hintergrund + kleines Label „Entwurf" + Button „Übernehmen" (Häkchen). **Übernommen (adopted=true):** solider Rahmen, weißer Hintergrund. Dieser sichtbare Zustandswechsel IST das Übernahme-Prinzip (F10/NF5) — bitte exakt so umsetzen.
- Inline-Bearbeitung des Inhalts über ✎ (Textarea in der Karte, Speichern/Abbrechen).

## 4. Phasenansichten

### Phase 1 — Situationsanalyse
1. **Eingabeformular (ProfileForm)**, 2-spaltig, Felder aus dem Project-Modell: Geschäftsidee* (Textarea), Produktstatus (Select: Idee/MVP/am Markt), vermutete Zielgruppe (optional — Platzhalter: „Leer lassen, wenn noch unklar — die KI schlägt Zielgruppenhypothesen vor"), vermutetes Kundenproblem, Nutzenversprechen, Erlösidee, Region, Teamgröße, Budget/Monat (Select), Zeit/Woche (Select), Fähigkeiten & Kanäle, bisherige Kundenerkenntnisse. Nur Geschäftsidee ist Pflicht.
2. Primärbutton **„Analyse erstellen"** → Ladezustand (Skeleton-Karten + Text „Die KI erstellt einen Analyse-Entwurf mit simulierten Recherchedaten …").
3. **Ergebnis in 4 Abschnitten** (untereinander, mit Anker-Navigation):
   - **PESTEL-Raster:** 6 Felder im 3×2-Grid, Kategorie-Titel + StatementCards
   - **Zielgruppen & Kundenprobleme:** Segment-Karten nebeneinander (2–4), darunter Problem-Statements
   - **Wettbewerb & Alternativen:** Karten mit Wettbewerber-Statements
   - **SWOT-Matrix:** klassisches 2×2 (Stärken | Schwächen / Chancen | Risiken), Quadranten dezent getönt, darin StatementCards; darunter „Erkennbare Marktpfade" als Liste
4. Kopfzeile des Ergebnisses: **Evidenz-Zusammenfassung** („12 Fakten · 18 Annahmen · 6 offene Fragen") + Button „Alle Entwürfe übernehmen" + je Karte einzeln übernehmbar. „+ Aussage hinzufügen" in jedem Abschnitt (manuelle Statements, origin=USER_INPUT).

### Phase 2 — Strategieoptionen
- Button „Optionen entwickeln" → 2–3 **OptionCards nebeneinander** (Grid, mobil untereinander).
- OptionCard: Titel, Kurzbeschreibung, dann 6 Dimensionszeilen (Label links: Zielgruppe, Kundenproblem, Nutzenversprechen, Positionierung, Marktzugang, Erlös-/Wachstumslogik; rechts die StatementCard kompakt). Fußzeile: Mini-Evidenzbilanz der Option („1 Fakt-gestützt · 4 Annahmen · 1 offen").
- Unter der Zielgruppen-Dimension (wenn das Statement ein segmentLabel trägt): aufklappbarer, schreibgeschützter Bereich **„Segmentprofil: {Label}"** (standardmäßig zugeklappt). Beim Aufklappen werden die übernommenen Profil-Statements dieses Segments live aus Phase 1 geladen und als kompakte Aspekt-Zeilen mit aktuellen Evidenz-Badges gezeigt (Badges hier NICHT klickbar — keine Duplikation, Phase 1 bleibt die einzige Quelle). Fußnote: „Quelle: Situationsanalyse — Änderungen dort vornehmen" mit Link zum Zielgruppen-Abschnitt von Phase 1. Ohne segmentLabel (Altbestand) entfällt der Bereich.
- Bewusst KEINE Bewertungselemente in dieser Phase (Modelltreue: Bewertung erst in Phase 3).

### Phase 3 — Bewertung & Priorisierung
- **EvaluationMatrix:** Tabelle, Zeilen = 6 Kriterien (deutsche Labels: Attraktivität, Ressourcenpassung, Tragbares Risiko, Prüfaufwand, Lernwert, Evidenzstärke), Spalten = Optionen. Zelle: Score als 5-Punkte-Leiste + Info-Icon mit Begründung (Popover/Details).
- Darunter **PrioritizationPanel:** Petrol-umrandete Karte „Priorisierungsvorschlag der KI" mit Begründung UND „Was dagegen sprechen könnte" (eigener Absatz — NF5!). Zwei Aktionen: **„Vorschlag übernehmen"** und **„Andere Option priorisieren"** (Auswahl + Pflichtfeld eigene Begründung). Zurückgestellte Optionen erscheinen darunter ausgegraut mit Label „Zurückgestellt — bleibt verfügbar".

### Phase 4 — Validierende Umsetzung
- Kopf: die priorisierte Option kompakt zusammengefasst.
- **Kritische Annahmen:** Liste der 2–4 markierten Statements (mit Badge), je Annahme darunter die zugehörige **ValidationStepCard**: Titel, Beschreibung, Kanal-Chip, Metriken als Zweispalter („✓ Stützend wenn: …" grün / „✗ Widerlegend wenn: …" rot-getönt). Entwurf/Übernahme wie überall.

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
Responsiv bis Mobil (Stepper wird horizontale Leiste, Options-Grid bricht um), sichtbarer Tastaturfokus (Petrol-Ring), Kontraste AA (die angegebenen Text-auf-BG-Paare erfüllen das), `prefers-reduced-motion` respektieren (ohnehin kaum Animation — nur sanfte Übergänge beim Entwurf→Übernommen-Wechsel).
