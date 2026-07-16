# Zielgruppen-Datenfluss-Audit

Stand: 12. Juli 2026

## Datenflussübersicht

| Prozesspunkt | Datenquelle | Speicherung | Verbraucher | Aktuelle Verwendung | Risiko | Erforderliche Anpassung |
|---|---|---|---|---|---|---|
| Projektprofil | ProfileForm/Onboarding, `Project.assumedTarget` | Textfeld am Projekt | Phase-1-Kontext, spätere Profilkontexte | Profilannahme, keine analysierte Zielgruppe | Kann fälschlich wie validiertes Segment wirken | Bleibt Kontext, nicht Segmentreferenz |
| Phase-1-Segmentgenerierung | `lib/prompts/phase1/segments.ts`, monolithischer Fallback | `Statement` mit `category=TARGET_SEGMENT`, `segmentLabel`, `segmentAspect`, `adopted=false` | Phase-1-UI, Phase 2/3/4/Cockpit nach Adoption | Bisher fünf Aspekte, `DESCRIPTION` als einzelnes Wer-Statement | Wer-Text vermischt Segmentkern, Bedarf, Preis, Kanal | Neue Aspekte `WHO_CORE`, `WHO_DISTINGUISHERS`, optional `WHO_BOUNDARY_ROLE`; `DESCRIPTION` Legacy |
| Nutzerübernahme | Einzelstatement, Profilkarte oder Bulk-Adoption | `Statement.adopted=true` | Folgephasen über `ACTIVE_ADOPTED_WHERE` | Nur übernommene aktive Statements im KI-Kontext | Superseded Statements dürfen nicht weiterlaufen | Filter beibehalten; Phase-2-Disclosure zusätzlich supersession-sicher |
| Phase-2-Kontext | Aktive Phase-1-Statements | Nicht kopiert; Prompt-Kontext | `/api/ai/2`, `/api/ai/2/revise` | Nutzt `segmentLabel` und alle Segmentaspekte | Segmentbezug nur Label, keine stabile Segment-ID | Teilstatements bleiben stabile IDs; Option fokussiert über Label und nutzt aktives Profil |
| OPT_TARGET_GROUP | Phase-2-LLM | Neues Statement Phase 2, `segmentLabel` am Statement | OptionCards, Phase 3, Phase 4, Cockpit, Phase 5 | Strategische Zielgruppenentscheidung als eigenes Statement | Kann Segmentprofil kopieren oder neue Zielgruppe erfinden | Prompt: Zuspitzung bleibt unterscheidbar vom Analyseprofil |
| Phase-3-Bewertung | Adopted Optionen + aktive Analyse | `Evaluation` je Option/Kriterium | Phase-3-UI/Priorisierung | Bisher Segmentprofil global, nicht optiongebunden | Bewertung sieht ggf. nur Kurzsatz | `addressedSegmentProfile` pro Option in Kontext |
| Priorisierte Option | `StrategyOption.status=PRIORITIZED` | Option + OptionStatements | Phase 4, Cockpit, Phase 5 | Stabile OptionStatement-Links zu Dimensionsstatements | Phase-1-Änderungen ändern bestehende Option nicht automatisch | Keine rückwirkende Umschreibung; ADAPT erzeugt Revision |
| Phase-4-Annahme | Priorisierte Optionsstatements | `ValidationStep.assumptionId` stabile Statement-ID | ValidationCore, Steps, Feedback | Whitelist nutzt active adopted option statements | `OPT_TARGET_GROUP` kann als Reichweite fehlklassifiziert werden | ValidationCore erweitert: Segmentkern, Präferenz, Kaufrolle nicht automatisch `REACHABILITY` |
| ValidationCore/Testdesign | `deriveValidationCore`, `derivePrimaryTestSubject`, Guards | Nicht persistiert; Step persistiert `testSubject` | Phase-4-LLM, Guards, Repair | ClaimType intern, `testSubject` persistiert | Rollen-/Segmentannahmen brauchen andere Signale als Klickrate | Neue ClaimTypes `SEGMENT_MEMBERSHIP`, `PREFERENCE`, `PURCHASE_ROLE` |
| Cockpit-Aufgaben | Adopted option + aktive Phase-1-Analyse | `Task`, optional `annahmenBezugId` | Task-Elaboration, Copy-Refinement | Bisher alle relevanten Phase-1-Segmente gemischt möglich | Copy/Aufgaben vermischen Zielgruppen | Filter auf Segment der priorisierten Option; Evidence in `copyBasis` |
| Phase-5-Evidenzupdate | `MarketFeedback.statementId` | Feedback verweist stabil auf geprüfte Annahme | EvidenceUpdateList, Supersession | Aktualisiert konkrete getestete Aussage | Pauschales Segmentupdate per Prompt möglich | Prompt: nur getestete Teilannahme aktualisieren |
| Supersession/ADAPT | User-Aktion in Phase 5 | Neues Statement adopted=true, altes `supersededByStatementId` | Folgekontexte, Option-Revision | Historische Referenzen bleiben | Phase-1-Teilstatements sind nicht direkt optionverlinkt | Bestehende Supersession bleibt; aktive Filter schließen Altes aus |

## Datenfluss in Reihenfolge

Projektprofil (`Project.assumedTarget`, reine Nutzereingabe)
→ Phase-1-Segmentgenerierung (Profil als Kontext, keine automatische Gleichsetzung)
→ Segmentstatements (`Statement.id` stabil; `segmentLabel` labelbasiert; `segmentAspect` strukturiert)
→ Nutzerübernahme (`adopted=true`; KI-Entwürfe bleiben `adopted=false`)
→ Phase-2-Kontext (`ACTIVE_ADOPTED_WHERE`, keine superseded Statements)
→ `OPT_TARGET_GROUP` (eigenes Phase-2-Statement; Label-Verbindung über `segmentLabel`, keine Segment-ID)
→ Phase-3-Bewertung (Option + `addressedSegmentProfile`, aktive Phase-1-Teilstatements)
→ priorisierte Option (`StrategyOption.status=PRIORITIZED`, OptionStatement-Links stabil)
→ Phase-4-Annahme (`ValidationStep.assumptionId` stabile Statement-ID)
→ ValidationCore und Testdesign (interner ClaimType, persistierter `testSubject`)
→ Cockpit-Aufgaben (priorisierte Option plus nur adressiertes Segmentprofil)
→ Phase-5-Evidenzupdate (`MarketFeedback.statementId` stabile geprüfte Aussage)
→ Supersession beziehungsweise ADAPT (`supersededByStatementId`, neue Option-Revision)
→ Rückkopplung in Phase 1 oder Phase 2 (neue Kontexte verwenden nur active adopted Statements)

## Markierungen

- Stabile ID-Referenz: `Statement.id`, `OptionStatement.statementId`, `ValidationStep.assumptionId`, `MarketFeedback.statementId`.
- Reine Text-/Label-Zuordnung: `segmentLabel` verbindet Phase-1-Profil mit `OPT_TARGET_GROUP`.
- Fuzzy Matching: keine zentrale fuzzy Segmentzuordnung; nur Text-Deduplikation in Phase 1.
- Kopien: Phase 2 erzeugt eigene Dimensionsstatements; Phase 5-Supersession erzeugt neue Statements.
- Nur eingeblendet: `SegmentProfileDisclosure` in Phase 2 zeigt Phase-1-Profil read-only.
- Veraltete Folgeergebnisse: Änderungen an Phase-1-Segmenten schreiben bestehende Optionen nicht automatisch um.
- Risiko unübernommener Aussagen: Folgephasen nutzen serverseitig `ACTIVE_ADOPTED_WHERE`; UI-Disclosure filtert adopted und nicht superseded.

## Schwachstellen vor Umsetzung

- `DESCRIPTION` bündelte den gesamten Bereich Wer unter einem Evidenzbadge.
- Phase 3 erhielt Segmentprofile nicht optiongebunden.
- Cockpit-Kontext konnte alle Phase-1-Zielgruppensegmente vermischen.
- Phase 4 erkannte Segmentkern-, Kaufrollen- und Präferenzannahmen nicht explizit.
- Cache-Version hätte alte Segmentmodul-Payloads mit einem einzelnen Wer-Statement wiederverwenden können.

## Technische Entscheidung

Keine Prisma-Migration: `Statement.segmentAspect` ist bereits ein String-Feld, und jedes Teilprofil bleibt ein eigenes Statement mit eigenem Evidenzstatus, eigener ID, Adoption und Supersession. Neue semantische Teiltypen werden über zentrale TypeScript-Konstanten, Zod-Schemas, Prompts, Validierung und UI-Labels eingeführt. `DESCRIPTION` bleibt nur für Legacy-Daten erhalten.
