# Thesis-Alignment: Bachelorarbeit ↔ Prototyp

Referenzarbeit: `standBA_040726_V6.pdf` (Stand 04.07.2026, V6)  
Begleitdokumente im Repo: `PrototypBeschreibung_KONTEXT.txt`, `IMPLEMENTIERUNGSPLAN.md`, `UI_KONZEPT.md`, `PROMPTS.md`

**Legende:** ✅ erfüllt · ⚠️ teilweise / bewusste Prototyp-Abweichung · ❌ fehlt oder unklar · 🔍 bei Änderungen prüfen

---

## 1. Prozessmodell (Kapitel 4) ↔ Tool

| Thesis-Phase | Modell-Inhalt | Tool-Umsetzung | Status |
|---|---|---|---|
| 4.3.1 | Hypothesenorientierte Situationsanalyse, Evidenzordnung, PESTEL/SWOT/Wettbewerb | Phase 1: Profil → KI-Analysebild (PESTEL, Segmente, Wettbewerb, SWOT, Marktpfade) | ✅ |
| 4.3.2 | 2–3 vorläufige Strategieoptionen als Hypothesenbündel (6 Dimensionen) | Phase 2: OptionCards, markt- + ressourcenorientierte Option | ✅ |
| 4.3.3 | Bewertung & Priorisierung (6 Kriterien), keine endgültige Festlegung | Phase 3: EvaluationMatrix + nutzerbestätigte Priorisierung | ✅ |
| 4.3.4 | Kritische Annahmen → begrenzte Validierungsschritte mit Messpunkten | Phase 4: ValidationSteps + Metrics | ✅ |
| 4.3.5 | Marktrückmeldungen → Evidenz-Update → Anpassungsentscheidung | Phase 5: Feedback, EvidenceUpdate, AdaptationPanel | ✅ |
| 4.2 | Iterativer Kreislauf, Rückkopplung | LOOP_BACK, ADAPT, CONTINUE, DEFER, DISCARD | ✅ |
| — | *(nicht im Kernmodell)* | Umsetzungs-Cockpit (Tasks, KPI-Simulation) | ⚠️ Erweiterung, thesis-konform begründbar |

**Modellprinzipien (querliegend):**

| Prinzip | Status | Nachweis im Tool |
|---|---|---|
| Evidenz: Fakt / Annahme / offene Frage | ✅ | `evidenceStatus`, EvidenceBadge, GLOBAL_PROMPT |
| Hypothesen statt Festlegungen | ✅ | `adopted=false` Entwürfe, Übernahme durch Nutzer |
| Ressourcensensibilität | ✅ | Profilfelder Budget/Zeit/Team/Skills, Prompts NF8 |
| Nutzer entscheidet, KI bereitet vor | ✅ | F10-Logik, Priorisierung/Adaptation manuell |
| Kein Chatbot | ✅ | Wizard, feste Phasen, JSON-Schemas |

---

## 2. Funktionale Anforderungen F1–F11 (Kapitel 5.1)

| ID | Anforderung (Kurz) | Tool / Doku | Status |
|---|---|---|---|
| **F1** | Prozessführung (5 Phasen) | PhaseStepper, `currentPhase` | ✅ |
| **F2** | Phasenbezogene Eingaben | ProfileOnboarding, ProfileForm, FeedbackForm | ✅ |
| **F3** | Webbasierte Informationsrecherche | LLM simuliert Recherche (`SIMULATED_RESEARCH`, fiktive `sourceRef`) | ⚠️ Prototyp-Abweichung (Kap. 5.3) |
| **F4** | Instrumentengestützte Situationsanalyse | PESTEL, Segmente, Wettbewerb, SWOT, Ressourcen | ✅ |
| **F5** | Hypothesen- & Evidenzordnung | Statement-Modell, Badges, Querschnitt alle Phasen | ✅ |
| **F6** | Vorläufige Strategieoptionen | Phase 2, 6 Dimensionen, Hypothesenbündel | ✅ |
| **F7** | Vergleich & Priorisierung | Phase 3, 6 Kriterien, Nutzerübersteuerung | ✅ |
| **F8** | Validierende Umsetzung | Phase 4, kritische Annahmen, Metrics | ✅ |
| **F9** | Lern- & Anpassungsunterstützung | Phase 5, Evidenz-Updates, AdaptationDecision | ✅ |
| **F10** | Bearbeitbarkeit & Co-Creation | Editieren, adoptieren, verwerfen, Revision | ✅ |
| **F11** | Revision & Rückkopplung | Rücksprünge, LOOP_BACK, ADAPT, inkrementelle Phase 1 | ✅ |

---

## 3. Nicht-funktionale Anforderungen NF1–NF9

| ID | Anforderung (Kurz) | Tool / Doku | Status |
|---|---|---|---|
| **NF1** | Nachvollziehbarkeit (Begründungen) | `justification`, Evaluation-Begründungen, RCC-ähnlich in Prompts | ✅ |
| **NF2** | Transparenz über Unsicherheit | `uncertainty`, EvidenceBadge, Entwurfs-Kennzeichnung | ✅ |
| **NF3** | Nutzerkontrolle | Keine Auto-Adoption, Priorisierung/Adaptation manuell | ✅ |
| **NF4** | Verständlichkeit | Deutsch UI, erklärende Leerzustände, kein Fachjargon-Zwang | ✅ 🔍 |
| **NF5** | Schutz vor unkritischer Übernahme | Entwurf/Übernommen-UI, Gegenargumente Phase 3, Prototyp-Banner | ✅ |
| **NF6** | Datenschutz & Verantwortung | Kein Auth, minimale Eingaben; keine explizite Datenschutz-UI | ⚠️ Prototyp-Scope |
| **NF7** | Konsistenz über Phasen | Nur `adopted=true` im KI-Kontext | ✅ |
| **NF8** | Ressourcenorientierung | Profil + GLOBAL_PROMPT | ✅ |
| **NF9** | Recherchetransparenz | `origin`, `sourceRef (fiktiv)`, Banner | ⚠️ bei F3: simuliert, aber transparent |

---

## 4. Theorie & Gestaltungsprinzipien (Kapitel 2 + 4.4) — Abdeckung in `PrototypBeschreibung_KONTEXT.txt`

| Thesis-Inhalt | In KONTEXT.txt? | Empfehlung |
|---|---|---|
| Start-up-Kontext (Unsicherheit, Ressourcen, Lernen) | Kurz (Abschn. 1) | Für Thesis-Schreiben: PDF Kap. 2.1 direkt zitieren |
| 4 Bausteine Homburg → Start-up-Anpassung | Implizit über 5 Phasen | Optional: 1 Absatz in KONTEXT ergänzen |
| KI als Decision Support / Co-Creation (2.3.2) | Ja (Kernidee) | — |
| Vertrauenswürdigkeit, RCC, Trust Calibration (2.3.3) | Teilweise (Design-Prinzipien) | F/NF-Mapping fehlte → **dieses Dokument** |
| 5 Implikationen Systementwicklung (4.4) | Implizit | Siehe Abschn. 5 unten |
| DSR-Methodik (Kap. 3) | Nein | Nur in der Arbeit, nicht im Tool nötig |
| Systemkonzept / Modularchitektur (Kap. 5.2) | Nein in PDF V6 | In Arbeit ggf. noch ausstehend |
| Evaluation Experteninterviews (Kap. 6) | Nein | Separates Evaluationsdesign |

---

## 5. Lücken: `PrototypBeschreibung_KONTEXT.txt` vs. Thesis

### Was gut abgedeckt ist
- Vollständiger Nutzerfluss (Abschn. 12)
- Datenmodell und API-Übersicht
- Prototyp-Einschränkungen (Abschn. 17) — deckt sich mit Kap. 5.3
- Begriffszuordnung DE ↔ Code

### Was fehlt oder nur implizit ist
1. **Explizites F1–F11 / NF1–NF9-Mapping** → jetzt in `THESIS_ALIGNMENT.md`
2. **Theorie-Kapitel 2** (Literaturbezug) → bewusst nicht im Tool-Doku-Scope
3. **Kap. 5.2 Modularchitektur** → in PDF V6 noch nicht enthalten
4. **Kap. 6 Evaluationsdesign** → nicht im Repo
5. **Dateiname in KONTEXT Abschn. 6/20** → verweist noch auf `CHATGPT_KONTEXT.txt` (korrigiert)

### Bewusste Prototyp-Abweichungen (für Kap. 5.3 dokumentieren)

| Thesis-Ziel | Prototyp-Lösung | Begründung |
|---|---|---|
| F3: Echte Web-Recherche | LLM simuliert Marktdaten | Kein Scraping/API, reproduzierbare Demo |
| Vollständiges DSS / Agentic AI | Phasen-Wizard mit JSON-LLM | Fokus Prozessmodell + Evidenzführung |
| Versionshistorie / Multi-User | Ein Projektstand, kein Auth | Prototyp-Vereinfachung |
| NF6: Datenschutz-Governance | Keine Privacy-UI | Bachelor-Prototyp, lokale/Supabase-Nutzung |

### Erweiterungen über das Kernmodell hinaus

| Feature | Thesis-Bezug | Status |
|---|---|---|
| Umsetzungs-Cockpit | Unterstützt 4.3.4 (Umsetzung + messbare Rückmeldungen) | ⚠️ sinnvolle Erweiterung |
| Task-Elaboration / Copy-Refinement | Nicht explizit gefordert | ⚠️ optional in Evaluation thematisieren |
| Phase-4-Refinement / Scale-Modi | Iteration nach 4.3.5 CONTINUE | ✅ thesis-konform |

---

## 6. Schnell-Checkliste bei neuen Features

Vor Merge / nach größeren Änderungen kurz prüfen:

- [ ] Passt die Änderung in **genau eine** der 5 Phasen (oder Rückkopplung)?
- [ ] Bleibt **F5/NF2**: Evidenzstatus sichtbar und manuell änderbar?
- [ ] Bleibt **F10/NF3/NF5**: KI-Output als Entwurf, Nutzer übernimmt explizit?
- [ ] Nutzen Folgephasen nur **`adopted=true`** Kontext? (NF7)
- [ ] Enthalten KI-Aussagen **justification** + ggf. **uncertainty** + **sourceRef (fiktiv)**? (NF1, NF9)
- [ ] Berücksichtigen Prompts **Ressourcen** aus dem Profil? (NF8)
- [ ] Wird **simulierte Recherche** nicht als echte Quelle dargestellt? (F3-Abweichung)
- [ ] Ermöglicht UI **Rücksprung** und Bearbeitung früherer Phasen? (F11)
- [ ] Wird keine strategische Entscheidung **automatisch** gesetzt (Priorisierung, Adaptation)?

---

## 7. Referenz für Thesis-Kapitel 5.3 / 5.4

**Screenshots / Demo empfohlen:**
1. Phase 1 — Analysebild mit Evidenz-Zusammenfassung
2. Phase 2 — OptionCards nebeneinander
3. Phase 3 — EvaluationMatrix + Priorisierung mit Gegenargumenten
4. Phase 4 — ValidationStep mit Metriken
5. Phase 5 — Evidenz-Update + AdaptationPanel (ggf. LOOP_BACK)
6. Optional: Umsetzungs-Cockpit als Erweiterung

**Formulierungshilfe Abweichung F3:**  
„Die in F3 geforderte webbasierte Informationsrecherche wird im Prototyp durch simulierte, LLM-generierte Marktdaten mit expliziter Fiktiv-Kennzeichnung operationalisiert (NF9), um den Fokus auf Prozessführung und Evidenzordnung zu legen.“

---

*Zuletzt abgeglichen mit PDF V6 und Codebase-Stand. Bei Thesis-Updates diese Datei mit anpassen.*
