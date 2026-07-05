# Implementierungsplan

Prototyp in 7 Meilensteinen (M0–M6). Jeder Meilenstein wird einzeln mit Cursor umgesetzt und im Browser geprüft, bevor der nächste beginnt.

## Ziel-Projektstruktur

```
marketing-strategie-prototyp/
├── .cursorrules
├── .env                          # DATABASE_URL, DIRECT_URL, OPENAI_API_KEY
├── docs/                         # IMPLEMENTIERUNGSPLAN, UI_KONZEPT, PROMPTS
├── prisma/schema.prisma
├── app/
│   ├── layout.tsx                # Grundlayout, Schriften, Prototyp-Hinweisbanner
│   ├── page.tsx                  # Startseite: Projektliste + "Neues Projekt"
│   ├── project/[id]/
│   │   ├── layout.tsx            # Projektrahmen: Header + PhaseStepper (Sidebar)
│   │   └── phase/[n]/page.tsx    # Rendert das jeweilige Phasenmodul (n = 1..5)
│   └── api/
│       ├── projects/route.ts     # Projekt anlegen/lesen
│       ├── statements/route.ts   # Statements CRUD (Status ändern, adopt, edit)
│       └── ai/[phase]/route.ts   # LLM-Aufrufe je Phase (serverseitig)
├── components/
│   ├── ui/                       # Basisbausteine: Button, Card, Input, Textarea, Select, Badge, Banner
│   ├── wizard/PhaseStepper.tsx   # 5-Phasen-Navigation mit Status (offen/aktiv/abgeschlossen)
│   ├── statements/
│   │   ├── StatementCard.tsx     # Kernkomponente: Inhalt + EvidenceBadge + OriginTag + Aktionen
│   │   ├── EvidenceBadge.tsx     # Fakt / Annahme / Offene Frage (klickbar → Status ändern)
│   │   └── OriginTag.tsx         # Nutzer / Recherche (simuliert) / KI-Ableitung
│   ├── phase1/                   # ProfileForm, PestelGrid, SegmentCards, CompetitorCards, SwotMatrix
│   ├── phase2/OptionCard.tsx     # Strategieoption als Karte mit 6 Dimensionen
│   ├── phase3/                   # EvaluationMatrix, PrioritizationPanel
│   ├── phase4/                   # CriticalAssumptionList, ValidationStepCard (mit Metrics)
│   └── phase5/                   # FeedbackForm, EvidenceUpdateList, AdaptationPanel
└── lib/
    ├── prisma.ts                 # Prisma-Client-Singleton
    ├── openai.ts                 # OpenAI-Client + callLLM(systemPrompt, context, zodSchema)
    ├── prompts/                  # phase1.ts ... phase5.ts + global.ts (aus docs/PROMPTS.md)
    └── schemas/                  # Zod-Schemata der LLM-Ausgaben je Phase
```

## Meilensteine

### M0 — Setup (manuell, ohne Cursor)
Next.js-Projekt, Dependencies, Supabase, `.env`, `prisma migrate dev`. Siehe README.
**Fertig wenn:** `npm run dev` läuft, Tabellen sind in Supabase sichtbar.

### M1 — Fundament: Datenzugriff, Projektanlage, Grundlayout
- `lib/prisma.ts`, `app/layout.tsx` mit Design-Tokens aus UI_KONZEPT (Schriften, Farben, Prototyp-Banner)
- Startseite: Projekte auflisten, neues Projekt anlegen (Name), Weiterleitung zu `project/[id]/phase/1`
- Projekt-Layout mit Header (Projektname) und PhaseStepper (statisch, Phase 1 aktiv)
**Fertig wenn:** Projekt anlegen funktioniert, Wizard-Rahmen sichtbar, Daten liegen in Supabase.

### M2 — Kernkomponenten: Statement, Badges, Übernahme-Prinzip
- StatementCard, EvidenceBadge (Status per Klick änderbar), OriginTag
- Statements-API: erstellen, bearbeiten, Evidenzstatus ändern, `adopted` setzen, löschen
- Demo-Ansicht in Phase 1 mit manuell angelegten Statements zum Testen
**Fertig wenn:** Statements können angelegt, bearbeitet, umgestuft und übernommen werden; Änderungen persistieren.

### M3 — Phase 1 komplett: Eingaben, KI-Anbindung, Analysebild
- ProfileForm (strukturierte Eingaben laut UI_KONZEPT, inkl. Ressourcenangaben; Speichern im Project)
- `lib/openai.ts` + `app/api/ai/1/route.ts` mit Phase-1-Prompt und Zod-Validierung
- Ergebnisdarstellung: PestelGrid, SegmentCards, CompetitorCards, SwotMatrix — alle Zellen bestehen aus StatementCards
- Entwurfs-/Übernahmelogik: Entwürfe (adopted=false) visuell abgesetzt, Übernahme einzeln + "Alle übernehmen"
**Fertig wenn:** Yoga-Beispiel eingeben → plausible fiktive Analyse erscheint in den vier Rastern → Statements prüfen/ändern/übernehmen funktioniert.

### M4 — Phasen 2 und 3: Optionen und Priorisierung
- Phase 2: `api/ai/2` erzeugt 2–3 StrategyOptions als Hypothesenbündel (Statements je Dimension, verknüpft über OptionStatement); Darstellung als OptionCards nebeneinander; Bearbeitung + Übernahme
- Phase 3: `api/ai/3` erzeugt Evaluations (6 Kriterien × Optionen) mit Begründungen + Priorisierungsvorschlag; EvaluationMatrix; Nutzer bestätigt oder übersteuert (setzt status=PRIORITIZED + rationale); Zurückgestellte Optionen → status=DEFERRED
**Fertig wenn:** Aus dem Analysebild entstehen Optionen, die Matrix zeigt begründete Scores, Priorisierung ist nutzerkontrolliert.

### M5 — Phasen 4 und 5: Validierung und Lernen
- Phase 4: `api/ai/4` markiert kritische Annahmen (isCritical) der priorisierten Option und erzeugt ValidationSteps mit Metrics (Erfolgs-/Misserfolgskriterium); Darstellung + Bearbeitung + Übernahme
- Phase 5: FeedbackForm (Nutzer erfasst fiktive Marktrückmeldungen je ValidationStep); `api/ai/5` verknüpft Feedback mit Annahmen, schlägt Statusänderungen (SUPPORTED/PARTIALLY/REFUTED → neuer Evidenzstatus) und eine Anpassungsentscheidung vor (CONTINUE/ADAPT/DEFER/DISCARD/LOOP_BACK); Nutzer bestätigt; bei LOOP_BACK Verweis zurück in frühere Phase
**Fertig wenn:** Ein kompletter Durchlauf inkl. Evidenz-Update und Anpassungsentscheidung funktioniert.

### M6 — Politur und Demonstration
- Stepper-Status dynamisch (abgeschlossen/aktiv/offen), Rücksprünge getestet
- Leere Zustände, Ladezustände ("Die KI erstellt den Entwurf …"), Fehlerzustände
- Konsistenz-Check: Phasen 2–5 nutzen nur adopted=true Statements
- Optional: Seed-Skript mit vorbefülltem Yoga-Projekt für die Experteninterviews
**Fertig wenn:** Kompletter Yoga-Durchlauf ohne Fehler; Screenshots für Kapitel 5.4 können erstellt werden.

## Hinweise für die Thesis (Kapitel 5.3/5.4)
- Nach M3 und M6 Screenshots sichern (Phase-1-Analysebild, OptionCards, EvaluationMatrix, Evidenz-Update).
- Die Prototyp-Einschränkungen für 5.3 ergeben sich direkt aus diesem Plan: simulierte Recherche, keine Authentifizierung, ein Projektstand ohne Versionierung, prototypischer Reifegrad.
