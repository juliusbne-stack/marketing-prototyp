# Phase-1 Modulare Architektur

Stand: Juli 2026 (Stabilisierungsphase)

## Ziel

Die monolithische Phase-1-Generierung wurde durch eine kontrollierte Fan-out/Fan-in-Architektur ergänzt. Die Stabilisierungsphase vervollständigt Reparaturen, Cache-Invalidierung, Laufverwaltung und Tests — ohne die Grundarchitektur neu zu bauen.

## Ablauf

1. Analyseanker (gemeinsame Grundlage, inkl. Wettbewerberplan)
2. Parallele Kernmodule (PESTEL, Segmente, Ressourcen, Wettbewerber-Batches 1–3)
3. Modulvalidierung und **gezielte Reparatur** (max. 1 Runde pro Modul/Objekt)
4. `replacementRequest`-Verarbeitung für Wettbewerber (ohne Analyseanker-Neugenerierung)
5. Nachgelagerte SWOT/Marktpfad-Synthese (mit Cache-Invalidierung bei Kernmodul-Änderungen)
6. Gesamtkonsistenzprüfung (programmatisch + optional LLM)
7. Normalisierung auf bestehendes Statement-Modell
8. Atomare Persistierung inkl. `Phase1Run`-Status

## Reparaturmatrix

| Modul | Reparaturarten |
|-------|----------------|
| PESTEL | Einzelne ungültige Aussage, irrelevante Kategorie mit Statements |
| Segmente | Einzelnes Segment ersetzen, fehlender Aspekt, fehlendes Pflichtsegment |
| Ressourcen | Fehlende Kategorien, einzelne ungültige Aussage |
| Wettbewerber | Einzelnes Profil, fehlender Aspekt, Kandidat passt nicht zum Anker |
| Synthese | Nur SWOT, nur Marktpfade, einzelne Aussagen, `derivedFrom`-Fix; vollständiger Ersatz nur bei strukturellem Totalausfall |
| Konsistenz | Einzelobjekt-Reparatur via `Phase1ConsistencyRepairTarget` |

Implementierung: `lib/phase1/repairTargets.ts`, `lib/phase1/moduleRepair.ts`, `lib/phase1/modules/generate.ts`

## replacementRequest-Ablauf

```
Modul liefert replacementRequest
→ serverseitige Validierung (lib/phase1/replacement.ts)
→ Kandidat im internen Plan ersetzen
→ nur Ersatzprofil generieren (generateSingleCompetitorProfile)
→ bei Ablehnung: einmaliger Retry mit Ablehnungsgrund
→ Synthese mit aktualisiertem Plan fortsetzen
```

Kein Analyseanker-Retry, kein Batch-Retry, kein Fallback bei erfolgreichem Ersatz.

## Fallback-Entscheidungslogik

`shouldUseMonolithicFallback()` in `lib/phase1/fallback.ts`

**Fallback nur bei:**
1. Analyseanker fehlt endgültig
2. Pflichtmodul bleibt trotz gezielter Reparatur unbrauchbar
3. Synthese bleibt trotz gezielter Reparatur unbrauchbar
4. Structured Outputs/SDK technisch nicht nutzbar
5. Unerwarteter fataler Orchestrierungsfehler

**Kein Fallback bei:** einzelnem Segmentfehler, fehlendem Wettbewerberaspekt, einzelner PESTEL-Aussage, Konsistenzfehler mit Reparaturanweisung, verarbeitbarem `replacementRequest`, Modul-Timeout (strukturierter Modulfehler).

Jeder Fallback wird geloggt: `{ runId, projectId, fallbackReason, failedModule, attemptedRepairs, timestamp }`

## Modulabhängigkeiten & Cache

`PHASE1_MODULE_DEPENDENCIES` in `lib/phase1/dependencies.ts`

Synthese-Hash hängt ab von: `anchorHash`, `pestelHash`, `segmentsHash`, `resourcesHash`, `competitorsHash`.

Cache-Versionierung (`lib/phase1/cacheVersions.ts`):
```ts
{ moduleVersion, promptVersion, schemaVersion, input }
```

Veraltete oder ungültige Cache-Payloads → Cache-Miss, Neugenerierung, Ersetzen des Eintrags.

## Phase1Run-Zustandsmaschine

Status: `RUNNING` | `COMPLETED` | `FAILED` | `ABORTED` | `FALLBACK`

Zulässige Übergänge:
- neu → RUNNING
- RUNNING → COMPLETED | FAILED | ABORTED | FALLBACK
- FALLBACK → COMPLETED | FAILED

Verwaiste Läufe: `PHASE1_RUN_STALE_AFTER_MS` (Default 900000) → als FAILED markieren.

Parallele Läufe: DB-basiertes Locking via `acquirePhase1RunLock()` → `409 Conflict` bei aktivem Lauf.

## Persistierung

`persistPhase1Atomically()` — finale Statements, `pestelRelevance`, `Phase1Run.status=COMPLETED` in einer Transaktion. Idempotenz über `runId`. Modul-Cache separat.

## Abort-Verhalten

- `AbortSignal` erreicht alle LLM-Calls
- Nach Abort: keine Reparatur, Synthese, Konsistenz, Persistierung
- Run wird `ABORTED`
- NDJSON-Stream wird sauber beendet

## Feature-Flags / Environment

Siehe `.env.example`. Neu: `PHASE1_RUN_STALE_AFTER_MS=900000`

## Testabdeckung

| Bereich | Dateien |
|---------|---------|
| Fallback-Logik | `lib/phase1/fallback.test.ts` |
| Cache-Hashes | `lib/phase1/dependencies.test.ts` |
| Replacement | `lib/phase1/replacement.test.ts` |
| Repair-Targets | `lib/phase1/repairTargets.test.ts` |
| Orchestrator (gemockt) | `lib/phase1/orchestrator.integration.test.ts` |
| UI-Stream-State | `components/phase1/streamState.test.ts` |
| Unit (bestehend) | hashing, normalize, batches, concurrency, performance.fixture |

Alle Tests ohne echte OpenAI-API-Aufrufe.

## Benchmark-Sicherheit

```bash
npm run benchmark:phase1
```

Nur Fixture-Simulation (keine realen API-Kosten). Live-Benchmark erfordert explizite Bestätigung.

## Bekannte verbleibende Risiken

- Konsistenz-Reparatur erzeugt Targets, führt aber noch keine vollständige LLM-Reparaturschleife vor Persistierung aus (Warnung + Speicherung)
- Competitor-`replacementRequest` bei parallelen Batches: Anker-Updates werden nach Batch-Abschluss zusammengeführt
- Kein E2E-Test gegen echte Datenbank (Prisma gemockt in Integrationstests)
- Metrics werden nur in Konsole geloggt, nicht in DB persistiert

## Structured Outputs

OpenAI SDK `chat.completions.parse` + `zodResponseFormat` (Zod 4).

## derivedFrom

Wird in der Synthese intern genutzt, nicht im Prisma-Statement-Modell persistiert.
