// Appended to buildPhase1Prompt when adopted phase-1 statements already exist.
export function buildPhase1IncrementalPrompt(options: {
  targetCompetitorCount: number;
  adoptedCompetitorLabelCount: number;
  requiredNewProfiles: number;
}): string {
  const { targetCompetitorCount, adoptedCompetitorLabelCount, requiredNewProfiles } =
    options;

  const competitorTargetBlock =
    requiredNewProfiles > 0
      ? `- COMPETITOR-Akteure: Für diese Analyse gilt targetCompetitorCount=${targetCompetitorCount}.
  Im Projektstand sind bereits ${adoptedCompetitorLabelCount} übernommene Akteursprofile
  (competitorLabel) vorhanden. Erzeuge GENAU ${requiredNewProfiles} vollständige NEUE
  Akteursprofile (je 6 Aspekte, neues competitorLabel) — keine Dubletten zu
  übernommenen Labels. Wähle wieder eine plausible Mischung aus direkten/indirekten
  Wettbewerbern, Substituten, DIY-, Offline-, Plattform- und ggf. regionalen Alternativen.`
      : `- COMPETITOR-Akteure: Für diese Analyse gilt targetCompetitorCount=${targetCompetitorCount}.
  Im Projektstand sind bereits ${adoptedCompetitorLabelCount} übernommene Akteursprofile
  vorhanden (≥ Zielanzahl). Erzeuge KEINE neuen vollständigen Akteursprofile — nur
  fehlende Aspekte zu bestehenden competitorLabels ergänzen, falls nötig.`;

  return `FOLGEANALYSE — INKREMENTELLER MODUS:
Im Projektkontext findest du adoptedAnalysisStatements: bereits übernommene
Aussagen des Projektstands. Dies ist KEINE Erstanalyse, sondern eine Ergänzung.
targetCompetitorCount=${targetCompetitorCount} (serverseitig für diesen Lauf festgelegt).

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
- Bei COMPETITOR: nur fehlende Akteursprofile oder fehlende Aspekte
  (competitorAspect) zu bestehenden competitorLabels ergänzen — keine
  bestehenden Aspekte neu formulieren. Landschafts-Aussagen ohne competitorLabel
  nur, wenn der Projektstand dort noch keine passende übergreifende Einschätzung hat.
  Wende die differenzierten COMPETITOR-Evidenzregeln aus dem Phase-1-Prompt an
  (FACT nur für objektnahe, simuliert belegte Angaben; RELEVANCE nie FACT).
${competitorTargetBlock}
- Bei SWOT: verdichtende Synthese ist erlaubt, aber keine bloße Wiederholung
  bereits übernommener Aussagen aus anderen Kategorien.
- pestelRelevance weiterhin für alle sechs Kategorien bewerten (Profil kann sich
  geändert haben). Neue PESTEL-Aussagen nur, wenn die Dimension relevant ist UND
  der Projektstand dort noch keine passende Aussage hat oder sich die Lage
  fachlich geändert hat. PESTEL-Qualitätsregeln und Self-Check aus dem
  Phase-1-Prompt gelten unverändert; nutze ventureAnchors und
  adoptedAnchorsForPestel aus dem Projektkontext.

Mengen in diesem Modus (Orientierung, keine Pflichtvorgabe außer COMPETITOR oben):
- PESTEL: 0–2 neue Aussagen je relevante Dimension
- TARGET_SEGMENT: 0–5 je neuem Segment oder fehlendem Aspekt
- CUSTOMER_PROBLEM, RESOURCE, SWOT, MARKET_PATH: 0–3 neue Aussagen
  je Bereich — nur wenn wirklich neu.`;
}
