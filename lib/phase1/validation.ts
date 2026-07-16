import { PESTEL_CATEGORIES } from "@/lib/schemas/phase1";
import { COMPETITOR_ASPECTS } from "@/lib/competitorAspects";
import {
  OPTIONAL_GENERATED_SEGMENT_ASPECTS,
  REQUIRED_GENERATED_SEGMENT_ASPECTS,
} from "@/lib/segmentAspects";
import type { Phase1Statement } from "@/lib/schemas/phase1";
import type {
  Phase1ModuleValidationIssue,
  Phase1ModuleValidationResult,
} from "./types";

function issue(
  path: string,
  code: string,
  message: string
): Phase1ModuleValidationIssue {
  return { path, code, message };
}

export function validatePestelModule(data: {
  pestelRelevance: Array<{ category: string; relevant: boolean }>;
  statements: Phase1Statement[];
}): Phase1ModuleValidationResult<typeof data> {
  const issues: Phase1ModuleValidationIssue[] = [];
  const warnings: string[] = [];

  if (data.pestelRelevance.length !== PESTEL_CATEGORIES.length) {
    issues.push(
      issue("pestelRelevance", "COUNT", "PESTEL-Relevanz muss 6 Einträge haben.")
    );
  }

  for (const entry of data.pestelRelevance) {
    const hasStatements = data.statements.some(
      (s) => s.category === entry.category
    );
    if (!entry.relevant && hasStatements) {
      issues.push(
        issue(
          `pestelRelevance.${entry.category}`,
          "IRRELEVANT_WITH_STATEMENTS",
          `Irrelevante Kategorie ${entry.category} enthält Statements.`
        )
      );
    }
    if (entry.relevant && !hasStatements) {
      warnings.push(`Relevante Kategorie ${entry.category} ohne neue Aussage.`);
    }
  }

  for (const statement of data.statements) {
    if (!statement.content.trim()) {
      issues.push(issue("statements", "EMPTY", "Leerer PESTEL-Content."));
    }
    if (
      statement.origin === "SIMULATED_RESEARCH" &&
      !statement.sourceRef?.includes("(fiktiv)")
    ) {
      issues.push(issue("statements", "SOURCE", "Fiktive Quelle fehlt."));
    }
  }

  if (issues.length > 0) {
    return { success: false, rawData: data, issues };
  }
  return { success: true, data, warnings };
}

export function validateSegmentsModule(data: {
  segments: Array<{ segmentLabel: string; statements: Phase1Statement[] }>;
  customerProblems: Phase1Statement[];
}): Phase1ModuleValidationResult<typeof data> {
  const issues: Phase1ModuleValidationIssue[] = [];
  const warnings: string[] = [];

  if (data.segments.length < 2) {
    issues.push(issue("segments", "COUNT", "Mindestens 2 Segmente erforderlich."));
  }

  for (const segment of data.segments) {
    const aspects = new Set(
      segment.statements.map((s) => s.segmentAspect).filter(Boolean)
    );
    const allowedGeneratedAspects = new Set<string>([
      ...REQUIRED_GENERATED_SEGMENT_ASPECTS,
      ...OPTIONAL_GENERATED_SEGMENT_ASPECTS,
    ]);
    const missingRequired = REQUIRED_GENERATED_SEGMENT_ASPECTS.filter(
      (aspect) => !aspects.has(aspect)
    );
    const duplicateAspects = segment.statements
      .map((s) => s.segmentAspect)
      .filter(Boolean).length !== aspects.size;
    const invalidGeneratedAspect = [...aspects].some(
      (aspect) => !allowedGeneratedAspects.has(String(aspect))
    );

    if (missingRequired.length > 0 || duplicateAspects || invalidGeneratedAspect) {
      issues.push(
        issue(
          `segments.${segment.segmentLabel}`,
          "ASPECTS",
          `Segment ${segment.segmentLabel} braucht Segmentkern, abgrenzende Merkmale sowie Problem, Verhalten, Zahlungsbereitschaft und Erreichbarkeit; Abgrenzung/Rolle ist optional.`
        )
      );
    }
  }

  if (data.customerProblems.length < 2) {
    issues.push(
      issue("customerProblems", "COUNT", "Mindestens 2 Kundenproblem-Aussagen.")
    );
  }

  if (issues.length > 0) return { success: false, rawData: data, issues };
  return { success: true, data, warnings };
}

export function validateResourcesModule(data: {
  statements: Phase1Statement[];
}): Phase1ModuleValidationResult<typeof data> {
  const issues: Phase1ModuleValidationIssue[] = [];
  if (data.statements.length < 2) {
    issues.push(issue("statements", "COUNT", "Mindestens 2 Ressourcen-Aussagen."));
  }
  if (issues.length > 0) return { success: false, rawData: data, issues };
  return { success: true, data, warnings: [] };
}

export function validateCompetitorsBatch(data: {
  profiles: Array<{
    candidateId: string;
    name: string;
    statements: Phase1Statement[];
  }>;
  landscapeStatements: Phase1Statement[];
  plannedCandidateIds: string[];
}): Phase1ModuleValidationResult<typeof data> {
  const issues: Phase1ModuleValidationIssue[] = [];
  const warnings: string[] = [];

  const returnedIds = new Set(data.profiles.map((p) => p.candidateId));
  for (const id of data.plannedCandidateIds) {
    if (!returnedIds.has(id)) {
      issues.push(
        issue(`profiles.${id}`, "MISSING", `Geplanter Kandidat ${id} fehlt.`)
      );
    }
  }

  for (const profile of data.profiles) {
    const aspects = new Set(
      profile.statements.map((s) => s.competitorAspect).filter(Boolean)
    );
    if (aspects.size !== COMPETITOR_ASPECTS.length) {
      issues.push(
        issue(
          `profiles.${profile.candidateId}`,
          "ASPECTS",
          `Profil ${profile.name} unvollständig.`
        )
      );
    }
  }

  if (issues.length > 0) return { success: false, rawData: data, issues };
  return { success: true, data, warnings };
}

export function validateSynthesisModule(data: {
  swotStatements: Phase1Statement[];
  marketPathStatements: Phase1Statement[];
}): Phase1ModuleValidationResult<typeof data> {
  const issues: Phase1ModuleValidationIssue[] = [];
  const swotCategories = [
    "SWOT_STRENGTH",
    "SWOT_WEAKNESS",
    "SWOT_OPPORTUNITY",
    "SWOT_THREAT",
  ] as const;

  for (const category of swotCategories) {
    const count = data.swotStatements.filter(
      (s) => s.category === category
    ).length;
    if (count < 2) {
      issues.push(
        issue(`swot.${category}`, "COUNT", `${category} hat weniger als 2 Aussagen.`)
      );
    }
  }

  if (data.marketPathStatements.length < 2) {
    issues.push(
      issue("marketPathStatements", "COUNT", "Mindestens 2 Marktpfade.")
    );
  }

  if (issues.length > 0) return { success: false, rawData: data, issues };
  return { success: true, data, warnings: [] };
}

export function validateCombinedPhase1(data: {
  statements: Phase1Statement[];
  competitorLabels: Set<string>;
  targetCompetitorCount: number;
}): Phase1ModuleValidationIssue[] {
  const issues: Phase1ModuleValidationIssue[] = [];
  const texts = new Set<string>();

  for (const statement of data.statements) {
    const key = statement.content.trim().toLowerCase();
    if (texts.has(key)) {
      issues.push(
        issue("statements", "DUPLICATE", "Exakter Textduplikat gefunden.")
      );
    }
    texts.add(key);
  }

  const tolerance = 1;
  if (
    Math.abs(data.competitorLabels.size - data.targetCompetitorCount) > tolerance
  ) {
    issues.push(
      issue(
        "competitors",
        "COUNT",
        `Wettbewerberzahl ${data.competitorLabels.size} weicht von Ziel ${data.targetCompetitorCount} ab.`
      )
    );
  }

  const segments = new Map<string, Phase1Statement[]>();
  for (const statement of data.statements) {
    if (statement.category !== "TARGET_SEGMENT" || !statement.segmentLabel) {
      continue;
    }
    segments.set(statement.segmentLabel, [
      ...(segments.get(statement.segmentLabel) ?? []),
      statement,
    ]);
  }

  for (const [label, group] of segments) {
    const aspects = new Set(group.map((statement) => statement.segmentAspect));
    const hasNewWho =
      aspects.has("WHO_CORE") || aspects.has("WHO_DISTINGUISHERS");
    if (hasNewWho) {
      const missing = REQUIRED_GENERATED_SEGMENT_ASPECTS.filter(
        (aspect) => !aspects.has(aspect)
      );
      if (missing.length > 0) {
        issues.push(
          issue(
            `segments.${label}`,
            "SEGMENT_PROFILE_INCOMPLETE",
            `Segment ${label} fehlt neue Pflichtaspekte: ${missing.join(", ")}.`
          )
        );
      }
    }

    const whoTexts = group
      .filter((statement) =>
        ["WHO_CORE", "WHO_DISTINGUISHERS", "WHO_BOUNDARY_ROLE"].includes(
          statement.segmentAspect ?? ""
        )
      )
      .map((statement) => statement.content.toLowerCase());
    if (
      whoTexts.some((text) =>
        /\b(kaufen|preis|zahlen|instagram|linkedin|tiktok|kanal|erreichbar|problem|bedarf)\b/i.test(
          text
        )
      )
    ) {
      issues.push(
        issue(
          `segments.${label}`,
          "SEGMENT_PROFILE_ASPECT_MIX",
          `Segment ${label} vermischt im Wer-Profil wahrscheinlich Preis-, Problem- oder Kanalannahmen mit dem Segmentkern.`
        )
      );
    }

    const core = group.find((statement) => statement.segmentAspect === "WHO_CORE");
    if (core && /\b(alle|jeder|menschen die unser|nutzer unserer|kunden unseres)\b/i.test(core.content)) {
      issues.push(
        issue(
          `segments.${label}.WHO_CORE`,
          "SEGMENT_CORE_TOO_GENERIC",
          `Segmentkern von ${label} ist zu breit oder produktdefiniert.`
        )
      );
    }
  }

  return issues;
}
