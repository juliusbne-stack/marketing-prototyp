# Nouriva Meals — Deterministisches Demo-Projekt

## Zweck

Das Demo-Projekt **Nouriva Meals – Vegane High-Protein-Fertigmahlzeiten** ist eine deterministische Demonstrationsinstanz für:

1. **Live-Durchlauf** (`start`): Profil ist gesetzt, Phasen sind noch offen. Beim Klick auf „KI erzeugen“ erscheinen die vorbereiteten Fixture-Ergebnisse (ohne OpenAI) — mit Streaming/Delay, damit es wie eine echte Analyse wirkt.
2. **Screenshots / Kapitel 5.4** (`full`, `phase4`, `phase5`): fertig befüllte End- bzw. Zwischenzustände.

Andere Projekte nutzen weiterhin die echte KI. Die Fake-KI greift **nur**, wenn der Projektname dem Nouriva-Demo entspricht.

## Ausführungsbefehle

```bash
# Empfohlen für Vorführungen: Startpunkt (Phase 1, keine Artefakte)
npm run demo:seed:start
# identisch — jederzeit zurücksetzen
npm run demo:reset:start

# Startpunkt prüfen
npm run demo:validate:start

# Vollständiger Endzustand (Phasen 1–5 inkl. Cockpit)
npm run demo:seed
npm run demo:reset
npm run demo:validate

# Screenshot-Zustand Phase 4
npm run demo:seed:phase4

# Einstieg Phase 5 (Cockpit mit KPIs, noch keine Marktrückmeldungen)
npm run demo:seed:phase5
npm run demo:validate:phase5

# Backup-Kopie des vollständigen Endzustands (eigener Projektname, überlebt demo:reset)
npm run demo:seed:backup
npm run demo:reset:backup
```

## Live-Demo (`demo:seed:start` / `demo:reset:start`)

| Aspekt | Verhalten |
|--------|-----------|
| `currentPhase` | `1` |
| Profil & Onboarding | vollständig (wie Masterdokument) |
| Phase-2-/Phase-4-Inputs | vorbefüllt (für reibungslosen Durchlauf) |
| Statements, Optionen, Steps, Feedback, Adaptation | **leer** |
| KI-Aufrufe | liefern Fixture-Inhalte als Entwürfe (`adopted: false` / `DRAFT`) |
| Nutzerfluss | Übernehmen, priorisieren, Phasen wechseln — wie bei normalen Projekten |

### Fake-KI (nur Nouriva)

| Endpoint | Fixture-Quelle |
|----------|----------------|
| `POST /api/ai/1` | Phase-1-Statements + PESTEL-Relevanz (NDJSON-Stream) |
| `POST /api/ai/2` | 3 Strategieoptionen (DRAFT) |
| `POST /api/ai/3` | Bewertungsmatrix + Empfehlung Option 1 |
| `POST /api/ai/4` | 3 ValidationSteps + Metriken (nicht übernommen) |
| `POST /api/ai/tasks` | 6 Aufgaben je Step |
| `POST /api/ai/5` | Feedback-Auswertung, LEARNING, ADAPT-Vorschlag |
| `POST /api/kpi/simulate` | Deterministische Kennzahlen je Szenario (Stützend/Gemischt/Widersprechend) |
| Task-Elaboration | vorbereitete Ausarbeitung für die passende Aufgabe |

**Tipps für Phase 5 / Cockpit**

- Marktrückmeldung: kurzer Text (unter 80 Zeichen) reicht — das Demo ersetzt ihn durch den Fixture-Text des jeweiligen Schritts.
- KPIs: „Kennzahlen simulieren“ nutzt die Fake-KI (ohne OpenAI).

## Enthaltene Phasen (Fixture-Inhalt)

| Phase | Inhalt |
|-------|--------|
| **1** | Profil, PESTEL-Relevanz, 18 PESTEL-Statements (ohne POLITICAL), 3 Zielgruppensegmente, Kundenprobleme, 10 Wettbewerberprofile, Ressourcen, SWOT, Marktpfade |
| **2** | 3 Strategieoptionen mit je 6 OPT-Dimensionen, Phase-2-PhaseInputs |
| **3** | 18 Bewertungen (3×6 Kriterien), Option 1 priorisiert |
| **4** | 3 ValidationSteps mit Metriken, Phase-4-PhaseInputs |
| **Cockpit** | 18 Aufgaben (6 je Step), 1 vollständige Task-Elaboration, 12 KPI-Datenpunkte |
| **5** | 3 Marktrückmeldungen, 4 LEARNING-Statements, bestätigte ADAPT-Entscheidung |

### Validierungslogik (Demo-Kohärenz)

- **Preis-/Vorbestelltest:** Entscheidende Messgröße ist nur die Reservierungsrate bei **10,90 Euro**. Die 9,90-Euro-Rate erscheint nicht als Periode dieser Metrik, sondern nur im Sensitivitätsvergleich (Differenzmetrik / Feedback).
- **Kaufmotive & Nichtkaufgründe:** Als `COUNT_OF_TOTAL` mit `evaluationConfig` bewertbar; Nichtkaufgründe beziehen sich auf **Nicht-Wiederkäufer** (Nenner 22), nicht auf alle Pilotkunden.
- **Revenue-Annahme:** Formulierung entspricht dem getesteten WTP-Teilaspekt; Boxarchitektur (6er/14er, Abo) bleibt Folgehypothese in Uncertainty/Adaption.

**Endzustand (`demo:seed`):** `currentPhase = 5`, `profileOnboardingComplete = true`, `profileOnboardingStep = 12`

**Screenshot Phase 4 (`demo:seed:phase4`):** `currentPhase = 4`, drei übernommene ValidationSteps in „Offene Validierung“, keine Marktrückmeldungen.

**Einstieg Phase 5 (`demo:seed:phase5`):** `currentPhase = 5`, drei übernommene Umsetzungsschritte mit Cockpit-KPIs, aber **keine** Marktrückmeldungen.

## Reset-Verhalten

- `demo:seed` / `demo:reset` (inkl. `:start`, `:phase4`, `:phase5`) löschen **ausschließlich** das Live-Demo mit Namen `Nouriva Meals – Vegane High-Protein-Fertigmahlzeiten` bzw. Slug `nouriva-meals`.
- `demo:seed:backup` / `demo:reset:backup` ersetzen nur das Backup `Nouriva Meals – Backup (Vollständiger Durchlauf)` (gleicher Fixture-Inhalt wie `full`). Das Live-Demo bleibt unberührt — und umgekehrt.
- Normale Nutzerprojekte werden **niemals** gelöscht.
- Der Seed läuft in einer Prisma-Transaktion; bei Fehlern bleibt kein halb befülltes Demo-Projekt zurück.

## Dateien

| Datei | Rolle |
|-------|-------|
| `lib/demo/constants.ts` | Name, Slug, Seed-Varianten |
| `lib/demo/identity.ts` | `isDemoProject()` |
| `lib/demo/fakeAi/*` | Fixture-Auslieferung statt OpenAI |
| `scripts/demo-fixture-data.ts` | Alle deterministischen Fixture-Daten |
| `scripts/seed-demo-project.ts` | Anlegen/Ersetzen des Demo-Projekts |
| `scripts/validate-demo-project.ts` | Post-Seed-Validierung |

## Bekannte nicht persistierte UI-Zwischenzustände

### Phase 3 — Unbestätigte KI-Empfehlung

Die KI-Priorisierungsempfehlung vor Nutzerbestätigung liegt nur im **Client-State**. Nach Bestätigung: priorisierte Option 1 inkl. `prioritizationRationale`.

### Phase 5 — Unbestätigter KI-Anpassungsvorschlag

Der Anpassungsvorschlag wird erst nach Nutzerbestätigung als `AdaptationDecision` gespeichert.

## Technische Zuordnung (Auszug)

| Masterdokument-Abschnitt | Prisma-Modell | Erwartete Anzahl (full) |
|---------------------------|---------------|-------------------------|
| Projektprofil | `Project` | 1 |
| PESTEL + Analyse | `Statement` (phase 1) | 129 |
| Phase-2-Inputs | `PhaseInput` (phase 2) | 3 |
| Strategieoptionen | `StrategyOption` | 3 |
| OPT-Dimensionen | `Statement` + `OptionStatement` | 18 |
| Bewertung | `Evaluation` | 18 |
| Phase-4-Inputs | `PhaseInput` (phase 4) | 6 |
| Validierung | `ValidationStep` | 3 |
| Messpunkte | `Metric` | 9 |
| Cockpit-Aufgaben | `Task` | 18 |
| KPI-Verläufe | `KpiDataPoint` | 12 |
| Marktrückmeldungen | `MarketFeedback` | 3 |
| Lernerkenntnisse | `Statement` (LEARNING) | 4 |
| Anpassung | `AdaptationDecision` | 1 |
