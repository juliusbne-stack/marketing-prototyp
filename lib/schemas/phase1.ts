import { z } from "zod";
import { SEGMENT_ASPECTS } from "@/lib/segmentAspects";

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

const phase1StatementSchema = z
  .object({
    category: phase1Category,
    content: z.string().trim().min(1),
    evidenceStatus: z.enum(["FACT", "ASSUMPTION", "OPEN_QUESTION"]),
    origin: z.enum(["USER_INPUT", "SIMULATED_RESEARCH", "AI_DERIVATION"]),
    justification: z.string().trim().min(1),
    sourceRef: z.string().trim().nullish(),
    uncertainty: z.string().trim().nullish(),
    segmentLabel: z.string().trim().min(1).nullish(),
    segmentAspect: segmentAspect.nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.category !== "TARGET_SEGMENT") return;
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
  });

function validatePestelRelevanceConsistency(
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

  for (const entry of data.pestelRelevance) {
    const hasStatements = data.statements.some(
      (statement) => statement.category === entry.category
    );

    if (!entry.relevant && hasStatements) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Für ${entry.category} ist relevant=false, aber es gibt Statements in dieser Kategorie.`,
        path: ["statements"],
      });
    }

    if (entry.relevant && !hasStatements) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Für ${entry.category} ist relevant=true, aber es fehlt mindestens eine Aussage in statements.`,
        path: ["statements"],
      });
    }
  }
}

export const phase1ResponseSchema = z
  .object({
    pestelRelevance: z.array(pestelRelevanceEntrySchema),
    statements: z.array(phase1StatementSchema).min(1),
  })
  .superRefine(validatePestelRelevanceConsistency);

export type Phase1Response = z.infer<typeof phase1ResponseSchema>;
export type Phase1Statement = z.infer<typeof phase1StatementSchema>;
