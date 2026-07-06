# M6 Konsistenz-Check: adopted=true & priorisierte Option

Stand: Meilenstein M6 (Politur). Geprüft: `app/api/ai/2` … `app/api/ai/5`.

## Regel (Architektur / .cursorrules Regel 3)

Nachfolgende Phasen dürfen als LLM-Kontext **nur** übernommene Aussagen (`adopted=true`) verwenden. Ab Phase 4 gilt zusätzlich: ausschließlich die **priorisierte** Strategieoption (`status=PRIORITIZED`).

## Ergebnis je Route

| Route | adopted=true Statements | Priorisierte Option | Entwürfe (adopted=false) im Kontext? | Status |
|-------|-------------------------|---------------------|--------------------------------------|--------|
| `api/ai/2` | Phase-1-Statements mit `where: { adopted: true }` | — (noch keine Option) | Nein | ✅ |
| `api/ai/3` | Phase 1 adopted + Dimensions-Statements per `.filter(s => s.adopted)` | — (alle übernommenen Optionen: ADOPTED/PRIORITIZED/DEFERRED) | Nein | ✅ |
| `api/ai/4` | Phase 1 adopted + adopted Dimensions der priorisierten Option | `status: PRIORITIZED` | Nein | ✅ |
| `api/ai/5` | adopted Dimensions der priorisierten Option; Annahmen über adopted ValidationSteps | `status: PRIORITIZED` | Nein | ✅ |

## Detailnachweise

### Phase 2 (`app/api/ai/2/route.ts`)

- Kontextfeld `adoptedAnalysisStatements`: Abfrage `phase: 1, adopted: true`.
- Guard bei leerem Ergebnis (400), bevor der LLM-Aufruf startet.
- Neu erzeugte Dimensions-Statements werden mit `adopted: false` gespeichert — sie fließen erst nach Nutzer-Übernahme in spätere Phasen ein.

### Phase 3 (`app/api/ai/3/route.ts`)

- Optionen: nur `status in [ADOPTED, PRIORITIZED, DEFERRED]` — keine `DRAFT`-Optionen.
- `adoptedAnalysisStatements`: Phase 1, `adopted: true`.
- `strategyOptions[].dimensions`: expliziter `.filter(statement => statement.adopted)`.
- DEFERRED-Optionen sind bewusst enthalten: sie wurden übernommen und zurückgestellt, nicht verworfen.

### Phase 4 (`app/api/ai/4/route.ts`)

- `strategyOption.findFirst({ status: PRIORITIZED })` — keine anderen Optionen.
- `adoptedDimensions`: `.filter(statement => statement.adopted)` aus der priorisierten Option.
- `adoptedAnalysisStatements`: Phase 1, `adopted: true`.
- ID-Validierung der kritischen Annahmen gegen die Vereinigung aus adopted Dimensions + adopted Analyse.

### Phase 5 (`app/api/ai/5/route.ts`)

- Priorisierte Option: `status: PRIORITIZED`.
- ValidationSteps: `where: { adopted: true }` — Entwurfsschritte fließen nicht ein.
- `prioritizedOption.dimensions`: `.filter(statement => statement.adopted)`.
- Phase-1-Analyse-Statements sind **nicht** im Kontext — bewusst, da Phase 5 ausschließlich auf Rückmeldungen zu übernommenen Umsetzungsschritten und der priorisierten Option aufsetzt. Kein Verstoß gegen die Entwurfs-Regel.

## Abweichungen

**Keine Korrektur erforderlich.** Alle vier Routen halten die adopted-Regel ein; Phasen 4 und 5 beschränken sich auf die priorisierte Option.

## Stepper-Navigation (Kurzprüfung)

- `PhaseStepper`: `isUnlocked = phase.number <= project.currentPhase` — Rücksprünge ohne Datenverlust (ein Projektstand, keine Versionierung).
- Abgeschlossen: grüner Haken (`evidence-fact-*` Tokens).
- Aktiv: Petrol (`accent` / `accent-soft`).
- Gesperrt: `opacity-60`, `cursor-not-allowed`, kein Link.
