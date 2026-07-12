import { z } from "zod";
import {
  MAX_COMPETITOR_COUNT,
  MIN_COMPETITOR_COUNT,
} from "@/lib/competitorCount";
import { SEGMENT_ASPECTS } from "@/lib/segmentAspects";
import { COMPETITOR_ASPECTS } from "@/lib/competitorAspects";
import { phase1EvidenceStatus, phase1Origin } from "@/lib/schemas/evidenceStatus";
import { validateStatementContentNotIntention } from "@/lib/schemas/statementContent";

export const PESTEL_CATEGORIES = [
  "PESTEL_POLITICAL",
  "PESTEL_ECONOMIC",
  "PESTEL_SOCIAL",
  "PESTEL_TECHNOLOGICAL",
  "PESTEL_ECOLOGICAL",
  "PESTEL_LEGAL",
] as const;

export type PestelCategory = (typeof PESTEL_CATEGORIES)[number];

const pestelCategory = z.enum(PESTEL_CATEGORIES);

const pestelRelevanceEntrySchema = z.object({
  category: pestelCategory,
  relevant: z.boolean(),
  relevanceJustification: z.string().trim().min(1),
});

export type PestelRelevance = z.infer<typeof pestelRelevanceEntrySchema>;

// Zod schema mirroring the phase 1 JSON output format from docs/PROMPTS.md.
// Categories are restricted to those the phase 1 prompt may produce.
const phase1Category = z.enum([
  ...PESTEL_CATEGORIES,
  "TARGET_SEGMENT",
  "CUSTOMER_PROBLEM",
  "COMPETITOR",
  "RESOURCE",
  "SWOT_STRENGTH",
  "SWOT_WEAKNESS",
  "SWOT_OPPORTUNITY",
  "SWOT_THREAT",
  "MARKET_PATH",
]);

const segmentAspect = z.enum(SEGMENT_ASPECTS);
const competitorAspect = z.enum(COMPETITOR_ASPECTS);

const FICTIVE_SOURCE_SUFFIX = "(fiktiv)";

/** LLM often misses one profile or misformats sourceRef — allow small drift. */
const COMPETITOR_COUNT_TOLERANCE = 1;

function normalizeSourceRef(sourceRef: string): string {
  return sourceRef.trim().replace(/[.\s]+$/, "");
}

function sourceRefEndsWithFiktiv(sourceRef: string | null | undefined): boolean {
  if (!sourceRef?.trim()) return false;
  return /\(fiktiv\)\s*$/i.test(normalizeSourceRef(sourceRef));
}

/**
 * Ensures SIMULATED_RESEARCH statements always have a canonical fiktive sourceRef.
 */
function ensureFiktivSourceRef(
  sourceRef: string | null | undefined,
  origin: StatementEvidenceFields["origin"]
): string | null | undefined {
  if (origin !== "SIMULATED_RESEARCH") {
    return sourceRef?.trim() ? normalizeSourceRef(sourceRef) : sourceRef ?? null;
  }

  let ref = sourceRef?.trim() ? normalizeSourceRef(sourceRef) : "";
  // Strip any existing (fiktiv) marker (any casing) and re-append canonically.
  ref = ref.replace(/\s*\(fiktiv\)\s*$/i, "").trim();
  if (!ref) {
    ref = "Simulierte Recherche";
  }
  return `${ref} (fiktiv)`;
}

function competitorCountAcceptable(
  actual: number,
  expected: number
): boolean {
  // Tolerance is relative to the per-run target — not a hard MIN_COMPETITOR_COUNT floor,
  // otherwise e.g. target=6 with actual=5 fails despite ±1 tolerance.
  return Math.abs(actual - expected) <= COMPETITOR_COUNT_TOLERANCE;
}

type StatementEvidenceFields = {
  category: string;
  evidenceStatus: "FACT" | "ASSUMPTION" | "OPEN_QUESTION";
  origin: "USER_INPUT" | "SIMULATED_RESEARCH" | "AI_DERIVATION";
  sourceRef?: string | null;
  competitorAspect?: (typeof COMPETITOR_ASPECTS)[number] | null;
};

function validateStatementEvidence(
  data: StatementEvidenceFields,
  ctx: z.RefinementCtx
) {
  if (data.origin === "SIMULATED_RESEARCH") {
    if (!data.sourceRef?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sourceRef ist bei origin SIMULATED_RESEARCH Pflicht.",
        path: ["sourceRef"],
      });
    } else if (!sourceRefEndsWithFiktiv(data.sourceRef)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `sourceRef muss mit „${FICTIVE_SOURCE_SUFFIX}" enden.`,
        path: ["sourceRef"],
      });
    }
  }

  if (
    data.evidenceStatus === "FACT" &&
    data.origin === "SIMULATED_RESEARCH" &&
    !sourceRefEndsWithFiktiv(data.sourceRef)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "FACT mit origin SIMULATED_RESEARCH erfordert sourceRef (endet mit '(fiktiv)').",
      path: ["sourceRef"],
    });
  }

  if (
    data.category === "COMPETITOR" &&
    data.competitorAspect === "RELEVANCE" &&
    data.evidenceStatus === "FACT"
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "COMPETITOR-RELEVANCE darf nicht als FACT markiert werden (nur ASSUMPTION oder AI_DERIVATION).",
      path: ["evidenceStatus"],
    });
  }
}

export const phase1StatementSchema = z
  .object({
    category: phase1Category,
    content: z.string().trim().min(1),
    evidenceStatus: phase1EvidenceStatus,
    origin: phase1Origin,
    justification: z.string().trim().min(1),
    sourceRef: z
      .string()
      .trim()
      .nullish()
      .transform((value) =>
        value ? normalizeSourceRef(value) : value
      ),
    uncertainty: z.string().trim().nullish(),
    segmentLabel: z.string().trim().min(1).nullish(),
    segmentAspect: segmentAspect.nullish(),
    competitorLabel: z.string().trim().min(1).nullish(),
    competitorAspect: competitorAspect.nullish(),
  })
  .transform((data) => ({
    ...data,
    sourceRef: ensureFiktivSourceRef(data.sourceRef, data.origin),
  }))
  .superRefine((data, ctx) => {
    validateStatementEvidence(data, ctx);

    if (data.category === "TARGET_SEGMENT") {
      if (!data.segmentLabel?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "segmentLabel ist bei TARGET_SEGMENT Pflicht.",
          path: ["segmentLabel"],
        });
      }
      if (!data.segmentAspect) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "segmentAspect ist bei TARGET_SEGMENT Pflicht.",
          path: ["segmentAspect"],
        });
      }
    }

    if (data.category === "COMPETITOR") {
      const hasLabel = !!data.competitorLabel?.trim();
      const hasAspect = !!data.competitorAspect;
      if (hasLabel !== hasAspect) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "competitorLabel und competitorAspect müssen bei COMPETITOR-Profilen gemeinsam gesetzt sein.",
          path: ["competitorLabel"],
        });
      }
    }

    if (data.category !== "TARGET_SEGMENT" && (data.segmentLabel || data.segmentAspect)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "segmentLabel/segmentAspect sind nur bei TARGET_SEGMENT erlaubt.",
        path: ["segmentLabel"],
      });
    }

    if (
      data.category !== "COMPETITOR" &&
      (data.competitorLabel || data.competitorAspect)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "competitorLabel/competitorAspect sind nur bei COMPETITOR erlaubt.",
        path: ["competitorLabel"],
      });
    }
  });

function validatePestelStructure(
  data: {
    pestelRelevance: PestelRelevance[];
    statements: z.infer<typeof phase1StatementSchema>[];
  },
  ctx: z.RefinementCtx
) {
  const categories = data.pestelRelevance.map((entry) => entry.category);
  const uniqueCategories = new Set(categories);

  if (data.pestelRelevance.length !== PESTEL_CATEGORIES.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `pestelRelevance muss genau ${PESTEL_CATEGORIES.length} Einträge enthalten.`,
      path: ["pestelRelevance"],
    });
  }

  if (uniqueCategories.size !== PESTEL_CATEGORIES.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Jede PESTEL-Kategorie muss in pestelRelevance genau einmal vorkommen.",
      path: ["pestelRelevance"],
    });
  }

  for (const category of PESTEL_CATEGORIES) {
    if (!uniqueCategories.has(category)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Fehlende PESTEL-Kategorie in pestelRelevance: ${category}.`,
        path: ["pestelRelevance"],
      });
    }
  }
}

function validatePestelRelevanceConsistency(
  data: {
    pestelRelevance: PestelRelevance[];
    statements: z.infer<typeof phase1StatementSchema>[];
  },
  ctx: z.RefinementCtx
) {
  validatePestelStructure(data, ctx);
  validatePestelNewStatements(data, ctx, () => false);
}

type Phase1StatementInput = z.infer<typeof phase1StatementSchema>;

function groupCompetitorProfiles(statements: Phase1StatementInput[]) {
  const profiles = new Map<string, Phase1StatementInput[]>();
  const landscape: Phase1StatementInput[] = [];

  for (const statement of statements) {
    if (statement.category !== "COMPETITOR") continue;
    const label = statement.competitorLabel?.trim();
    if (!label) {
      landscape.push(statement);
      continue;
    }
    const group = profiles.get(label) ?? [];
    group.push(statement);
    profiles.set(label, group);
  }

  return { profiles, landscape };
}

function validateCompetitorProfileAspects(
  label: string,
  group: Phase1StatementInput[],
  ctx: z.RefinementCtx
) {
  const aspects = group
    .map((statement) => statement.competitorAspect)
    .filter((aspect): aspect is (typeof COMPETITOR_ASPECTS)[number] => !!aspect);
  const uniqueAspects = new Set(aspects);

  if (aspects.length !== COMPETITOR_ASPECTS.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Akteur „${label}“ muss genau ${COMPETITOR_ASPECTS.length} COMPETITOR-Statements haben (gefunden: ${aspects.length}).`,
      path: ["statements"],
    });
    return;
  }

  if (uniqueAspects.size !== COMPETITOR_ASPECTS.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Akteur „${label}“ hat doppelte oder fehlende competitorAspect-Werte.`,
      path: ["statements"],
    });
    return;
  }

  for (const aspect of COMPETITOR_ASPECTS) {
    if (!uniqueAspects.has(aspect)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Akteur „${label}“ fehlt competitorAspect ${aspect}.`,
        path: ["statements"],
      });
    }
  }
}

function validateCompetitorStructureFull(
  statements: Phase1StatementInput[],
  targetCompetitorCount: number,
  ctx: z.RefinementCtx
) {
  if (
    targetCompetitorCount < MIN_COMPETITOR_COUNT ||
    targetCompetitorCount > MAX_COMPETITOR_COUNT
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `targetCompetitorCount muss zwischen ${MIN_COMPETITOR_COUNT} und ${MAX_COMPETITOR_COUNT} liegen.`,
      path: ["statements"],
    });
    return;
  }

  const { profiles, landscape } = groupCompetitorProfiles(statements);

  if (!competitorCountAcceptable(profiles.size, targetCompetitorCount)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Es müssen ca. ${targetCompetitorCount} unterschiedliche Akteursprofile (competitorLabel) vorhanden sein (gefunden: ${profiles.size}, Toleranz ±${COMPETITOR_COUNT_TOLERANCE}).`,
      path: ["statements"],
    });
  }

  for (const [label, group] of profiles) {
    validateCompetitorProfileAspects(label, group, ctx);
  }

  if (landscape.length < 1 || landscape.length > 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Es müssen 1–3 Landschafts-Aussagen ohne competitorLabel vorhanden sein (gefunden: ${landscape.length}).`,
      path: ["statements"],
    });
  }
}

function validateCompetitorStructureIncremental(
  statements: Phase1StatementInput[],
  adoptedCompetitorLabels: Set<string>,
  requiredNewProfiles: number,
  ctx: z.RefinementCtx
) {
  const { profiles } = groupCompetitorProfiles(statements);
  const newProfiles = [...profiles.entries()].filter(
    ([label]) => !adoptedCompetitorLabels.has(label)
  );
  const adoptedProfileUpdates = [...profiles.entries()].filter(([label]) =>
    adoptedCompetitorLabels.has(label)
  );

  if (
    requiredNewProfiles > 0 &&
    !competitorCountAcceptable(newProfiles.length, requiredNewProfiles)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Es müssen ca. ${requiredNewProfiles} neue vollständige Akteursprofile erzeugt werden (gefunden: ${newProfiles.length}, Toleranz ±${COMPETITOR_COUNT_TOLERANCE}).`,
      path: ["statements"],
    });
  }

  if (requiredNewProfiles === 0 && newProfiles.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Keine neuen vollständigen Akteursprofile erforderlich — nur fehlende Aspekte zu übernommenen Labels ergänzen.",
      path: ["statements"],
    });
  }

  for (const [label, group] of newProfiles) {
    validateCompetitorProfileAspects(label, group, ctx);
  }

  for (const [label, group] of adoptedProfileUpdates) {
    const aspects = new Set(
      group
        .map((statement) => statement.competitorAspect)
        .filter((aspect): aspect is (typeof COMPETITOR_ASPECTS)[number] => !!aspect)
    );
    if (aspects.size !== group.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Ergänzungen für übernommenen Akteur „${label}“ dürfen keinen doppelten competitorAspect enthalten.`,
        path: ["statements"],
      });
    }
    if (group.length >= COMPETITOR_ASPECTS.length) {
      validateCompetitorProfileAspects(label, group, ctx);
    }
  }
}

function validatePestelNewStatements(
  data: {
    pestelRelevance: PestelRelevance[];
    statements: z.infer<typeof phase1StatementSchema>[];
  },
  ctx: z.RefinementCtx,
  hasAdoptedInCategory: (category: string) => boolean
) {
  for (const entry of data.pestelRelevance) {
    const hasNewStatements = data.statements.some(
      (statement) => statement.category === entry.category
    );

    if (!entry.relevant && hasNewStatements) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Für ${entry.category} ist relevant=false, aber es gibt Statements in dieser Kategorie.`,
        path: ["statements"],
      });
    }

    if (
      entry.relevant &&
      !hasNewStatements &&
      !hasAdoptedInCategory(entry.category)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Für ${entry.category} ist relevant=true, aber es fehlt mindestens eine Aussage in statements.`,
        path: ["statements"],
      });
    }
  }
}

function validateStatementContents(
  statements: Phase1StatementInput[],
  ctx: z.RefinementCtx
) {
  statements.forEach((statement, index) => {
    validateStatementContentNotIntention(
      statement.content,
      ctx,
      ["statements", index, "content"],
      `Aussage ${index + 1}`
    );
  });
}

function validateRequiredAnalysisSections(
  statements: Phase1StatementInput[],
  ctx: z.RefinementCtx
) {
  const resourceCount = statements.filter(
    (statement) => statement.category === "RESOURCE"
  ).length;
  if (resourceCount < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Es müssen mindestens 2 RESOURCE-Aussagen vorhanden sein (gefunden: ${resourceCount}).`,
      path: ["statements"],
    });
  }

  const swotCategories = [
    "SWOT_STRENGTH",
    "SWOT_WEAKNESS",
    "SWOT_OPPORTUNITY",
    "SWOT_THREAT",
  ] as const;

  for (const category of swotCategories) {
    const count = statements.filter(
      (statement) => statement.category === category
    ).length;
    if (count < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Es müssen mindestens 2 ${category}-Aussagen vorhanden sein (gefunden: ${count}).`,
        path: ["statements"],
      });
    }
  }

  const marketPathCount = statements.filter(
    (statement) => statement.category === "MARKET_PATH"
  ).length;
  if (marketPathCount < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Es müssen mindestens 2 MARKET_PATH-Aussagen vorhanden sein (gefunden: ${marketPathCount}).`,
      path: ["statements"],
    });
  }
}

/** Schema for the initial Phase-1 analysis with a fixed actor target count. */
export function createPhase1ResponseSchema(targetCompetitorCount: number) {
  return z
    .object({
      pestelRelevance: z.array(pestelRelevanceEntrySchema),
      statements: z.array(phase1StatementSchema).min(1),
    })
    .superRefine((data, ctx) => {
      validatePestelRelevanceConsistency(data, ctx);
      validateCompetitorStructureFull(
        data.statements,
        targetCompetitorCount,
        ctx
      );
      validateRequiredAnalysisSections(data.statements, ctx);
      validateStatementContents(data.statements, ctx);
    });
}

function validatePestelRelevanceIncremental(
  data: {
    pestelRelevance: PestelRelevance[];
    statements: Phase1StatementInput[];
  },
  adoptedCategories: Set<string>,
  ctx: z.RefinementCtx
) {
  validatePestelStructure(data, ctx);
  validatePestelNewStatements(data, ctx, (category) =>
    adoptedCategories.has(category)
  );
}

type AdoptedCompetitorStatement = {
  category: string;
  competitorLabel?: string | null;
};

/** Relaxed schema for follow-up analyses when adopted statements already exist. */
export function createPhase1IncrementalResponseSchema(
  adoptedStatements: Array<AdoptedCompetitorStatement>,
  options: {
    targetCompetitorCount: number;
    requiredNewProfiles: number;
  }
) {
  const adoptedCategories = new Set(
    adoptedStatements.map((statement) => statement.category)
  );
  const adoptedCompetitorLabels = new Set(
    adoptedStatements
      .filter(
        (statement) =>
          statement.category === "COMPETITOR" &&
          statement.competitorLabel?.trim()
      )
      .map((statement) => statement.competitorLabel!.trim())
  );

  return z
    .object({
      pestelRelevance: z.array(pestelRelevanceEntrySchema),
      statements: z.array(phase1StatementSchema),
    })
    .superRefine((data, ctx) => {
      validatePestelRelevanceIncremental(data, adoptedCategories, ctx);
      validateCompetitorStructureIncremental(
        data.statements,
        adoptedCompetitorLabels,
        options.requiredNewProfiles,
        ctx
      );
      validateStatementContents(data.statements, ctx);
    });
}

export type Phase1Response = z.infer<
  ReturnType<typeof createPhase1ResponseSchema>
>;
export type Phase1Statement = z.infer<typeof phase1StatementSchema>;
