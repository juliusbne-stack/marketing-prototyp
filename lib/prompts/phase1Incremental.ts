// Appended to PHASE1_PROMPT when adopted phase-1 statements already exist.
export const PHASE1_INCREMENTAL_PROMPT = `FOLGEANALYSE — INKREMENTELLER MODUS:
Im Projektkontext findest du adoptedAnalysisStatements: bereits übernommene
Aussagen des Projektstands. Dies ist KEINE Erstanalyse, sondern eine Ergänzung.

REGELN:
- Erzeuge NUR neue Entwürfe, die über adoptedAnalysisStatements hinausgehen.
- KEINE Paraphrasen, Umformulierungen oder inhaltlichen Dubletten — auch nicht
  mit anderen Worten. Wenn dieselbe Behauptung bereits abgedeckt ist: lasse sie weg.
- Eine neue Aussage ist nur zulässig, wenn sie (a) aus geänderten Profilangaben,
  (b) aus neuer simulierter Recherche oder (c) aus einem klar neuen strategischen
  Blickwinkel stammt, der im Projektstand noch fehlt.
- Wenn für einen Bereich keine neue relevante Erkenntnis ableitbar ist: erzeuge
  dort KEINE Aussage im statements-Array (leer lassen ist erlaubt).
- Bei RESOURCE: nur Ressourcen/Fähigkeiten nennen, die im Profil vorkommen, aber
  in adoptedAnalysisStatements noch nicht als Aussage abgebildet sind.
- Bei TARGET_SEGMENT: nur fehlende Segmentprofile oder fehlende Aspekte
  (segmentAspect) zu bestehenden segmentLabels ergänzen — keine bestehenden
  Aspekte neu formulieren.
- Bei COMPETITOR: nur fehlende Wettbewerberprofile oder fehlende Aspekte
  (competitorAspect) zu bestehenden competitorLabels ergänzen — keine
  bestehenden Aspekte neu formulieren. Landschafts-Aussagen ohne competitorLabel
  nur, wenn der Projektstand dort noch keine passende übergreifende Einschätzung hat.
- Bei SWOT: verdichtende Synthese ist erlaubt, aber keine bloße Wiederholung
  bereits übernommener Aussagen aus anderen Kategorien.
- pestelRelevance weiterhin für alle sechs Kategorien bewerten (Profil kann sich
  geändert haben). Neue PESTEL-Aussagen nur, wenn die Dimension relevant ist UND
  der Projektstand dort noch keine passende Aussage hat oder sich die Lage
  fachlich geändert hat.

Mengen in diesem Modus (Orientierung, keine Pflichtvorgabe):
- PESTEL: 0–2 neue Aussagen je relevante Dimension
- TARGET_SEGMENT: 0–5 je neuem Segment oder fehlendem Aspekt
- CUSTOMER_PROBLEM, COMPETITOR, RESOURCE, SWOT, MARKET_PATH: 0–3 neue Aussagen
  je Bereich — nur wenn wirklich neu.`;
