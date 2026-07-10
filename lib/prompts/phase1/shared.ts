export const PHASE1_EDITORIAL_GUIDANCE = `Formuliere so kompakt wie möglich, aber so ausführlich wie fachlich erforderlich. Vollständigkeit, Eindeutigkeit und Nachvollziehbarkeit haben Vorrang vor dem Längenziel. Überschreite die Orientierung, wenn andernfalls eine relevante Bedingung, Ursache, Einschränkung, Zielgruppe, Wirkung oder Unsicherheit verloren ginge.

Orientierung (keine harten Obergrenzen):
- content: in der Regel 1–3 präzise Sätze, häufig ca. 25–60 Wörter
- justification: in der Regel 1–3 erläuternde Sätze, häufig ca. 20–60 Wörter
- uncertainty: meist ein klarer Satz, häufig ca. 10–35 Wörter
- sourceRef: knapp und eindeutig; bei simulierter Recherche mit „(fiktiv)" enden

Die Felder content, justification und uncertainty dürfen sich nicht gegenseitig bloß paraphrasieren.
Wenn eine Aussage mehrere unabhängig prüfbare Behauptungen enthält, teile sie sinnvoll auf — nicht künstlich fragmentieren.`;

export const PHASE1_SHARED_RULES = `GEMEINSAME REGELN (alle Module):
- Ausgabesprache: Deutsch
- Start-up-Bezug und Ressourcenorientierung (Budget, Team, Zeit, Fähigkeiten)
- Evidenzstatus: FACT | ASSUMPTION | OPEN_QUESTION
- Herkunft: USER_INPUT | SIMULATED_RESEARCH | AI_DERIVATION
- Simulierte Quellen sind fiktiv und enden mit „(fiktiv)"
- Keine Auto-Adoption — adopted/phase werden serverseitig gesetzt
- Keine erfundenen echten Quellen oder URLs
- Keine Widersprüche zum Analyseanker
- Keine bloßen Allgemeinplätze oder semantischen Dubletten innerhalb des Moduls
- Vollständige Bearbeitung des jeweiligen Moduls
- Klare Trennung von Aussage (content), Begründung (justification) und Unsicherheit (uncertainty)
- Keine vorweggenommenen Strategieoptionen aus Phase 2
${PHASE1_EDITORIAL_GUIDANCE}`;

export function buildModuleUserPrompt(parts: {
  anchor: unknown;
  startupProfile: unknown;
  adoptedAnalysis?: unknown;
  moduleTask: string;
  extraContext?: Record<string, unknown>;
}): string {
  const sections = [
    "ANALYSEANKER (verbindlich):",
    JSON.stringify(parts.anchor, null, 2),
    "",
    "START-UP-PROFIL:",
    JSON.stringify(parts.startupProfile, null, 2),
  ];

  if (parts.adoptedAnalysis) {
    sections.push(
      "",
      "ÜBERNOMMENE PROJEKTAUSSAGEN (adopted=true, verbindlicher Kontext):",
      JSON.stringify(parts.adoptedAnalysis, null, 2)
    );
  }

  if (parts.extraContext && Object.keys(parts.extraContext).length > 0) {
    sections.push(
      "",
      "MODUL-KONTEXT:",
      JSON.stringify(parts.extraContext, null, 2)
    );
  }

  sections.push("", "AUFGABE:", parts.moduleTask);
  return sections.join("\n");
}
