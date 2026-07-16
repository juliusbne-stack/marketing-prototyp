# Nouriva Meals — Deterministisches Demo-Projekt

## Zweck

Das Demo-Projekt **Nouriva Meals – Vegane High-Protein-Fertigmahlzeiten** ist eine vollständig vorbefüllte, deterministische Demonstrationsinstanz für Screenshots, qualitative Artefakt-Demonstration (Kapitel 5.4) und reproduzierbare Tests.

Alle Inhalte stammen aus `Nouriva_Meals_Demo_Masterdokument.docx` und werden **ohne OpenAI- oder andere KI-API-Aufrufe** direkt über Prisma in dieselben Modelle geschrieben, die der reguläre Nutzerfluss verwendet.

## Ausführungsbefehle

```bash
# Demo-Projekt anlegen oder ersetzen (nur das Nouriva-Demo-Projekt)
npm run demo:seed

# Identisch zu demo:seed — löscht ausschließlich das Demo-Projekt und legt es neu an
npm run demo:reset

# Relationen, Statuswerte und Mindestmengen prüfen (Exit-Code 1 bei Fehlern)
npm run demo:validate

# Screenshot-Zustand Phase 4: kritische Annahmen, ohne Phase-5-Rückmeldungen
npm run demo:seed:phase4

# Einstieg Phase 5: Cockpit mit KPIs, Marktrückmeldungen noch nicht erfasst
npm run demo:seed:phase5
```

## Enthaltene Phasen

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

**Endzustand (vollständig):** `currentPhase = 5`, `profileOnboardingComplete = true`, `profileOnboardingStep = 12`

**Screenshot Phase 4 (`demo:seed:phase4`):** `currentPhase = 4`, drei übernommene ValidationSteps in „Offene Validierung“, keine Marktrückmeldungen. Beim Öffnen des Projekts von der Startseite landet man direkt in Phase 4.

**Einstieg Phase 5 (`demo:seed:phase5`):** `currentPhase = 5`, drei übernommene Umsetzungsschritte mit Cockpit-KPIs, aber **keine** Marktrückmeldungen, keine KI-Auswertung, keine LEARNING-Statements und keine Adaptationsentscheidung. Entspricht dem Zustand direkt nach dem Wechsel vom Umsetzungs-Cockpit zu Phase 5.

## Reset-Verhalten

- `demo:seed` und `demo:reset` löschen **ausschließlich** Projekte mit dem Namen `Nouriva Meals – Vegane High-Protein-Fertigmahlzeiten` bzw. Slug `nouriva-meals`.
- Normale Nutzerprojekte werden **niemals** gelöscht.
- Kein globales `deleteMany` ohne Filter.
- Der Seed läuft in einer Prisma-Transaktion; bei Fehlern bleibt kein halb befülltes Demo-Projekt zurück.

## Dateien

| Datei | Rolle |
|-------|-------|
| `lib/demo/constants.ts` | `DEMO_PROJECT_NAME`, `DEMO_PROJECT_SLUG`, `DEMO_BASE_TIME` |
| `scripts/demo-fixture-data.ts` | Alle deterministischen Fixture-Daten |
| `scripts/seed-demo-project.ts` | Anlegen/Ersetzen des Demo-Projekts |
| `scripts/validate-demo-project.ts` | Post-Seed-Validierung |

## Bekannte nicht persistierte UI-Zwischenzustände

### Phase 3 — Unbestätigte KI-Empfehlung

Die KI-Priorisierungsempfehlung vor Nutzerbestätigung liegt nur im **Client-State** und ist nicht in der Datenbank gespeichert. Das Demo-Projekt zeigt den stabilen **Endzustand nach Priorisierung**:

- vollständige Bewertungsmatrix
- priorisierte Option 1 („Performance ohne Meal Prep“)
- vollständige `prioritizationRationale`

### Phase 5 — Unbestätigter KI-Anpassungsvorschlag

Der KI-Anpassungsvorschlag und die clientseitige `evidenceBalance` sind nicht dauerhaft persistiert. Das Demo-Projekt zeigt den stabilen **bestätigten Endzustand**:

- ausgewertete Marktrückmeldungen mit `statusApplied = true`
- aktualisierte Evidenzstatus der geprüften Annahmen
- LEARNING-Statements
- bestätigte `AdaptationDecision` mit `decision = ADAPT` und `userConfirmed = true`

## Technische Zuordnung (Auszug)

| Masterdokument-Abschnitt | Prisma-Modell | Erwartete Anzahl |
|---------------------------|---------------|------------------|
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

## Supersession

Im Masterdokument ist keine Statement-Supersession vorgesehen. Alle relevanten Statements haben `adopted = true` und `supersededByStatementId = null`.
