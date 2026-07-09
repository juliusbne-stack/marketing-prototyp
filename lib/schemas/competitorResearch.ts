import { z } from "zod";
import { COMPETITOR_ASPECTS } from "@/lib/competitorAspects";
import { phase1EvidenceStatus, phase1Origin } from "@/lib/schemas/evidenceStatus";

const FICTIVE_SOURCE_SUFFIX = "(fiktiv)";

function normalizeSourceRef(sourceRef: string): string {
  return sourceRef.trim().replace(/[.\s]+$/, "");
}

function sourceRefEndsWithFiktiv(sourceRef: string | null | undefined): boolean {
  if (!sourceRef?.trim()) return false;
  return /\(fiktiv\)\s*$/i.test(normalizeSourceRef(sourceRef));
}

function ensureFiktivSourceRef(
  sourceRef: string | null | undefined,
  origin: z.infer<typeof phase1Origin>
): string | null {
  if (origin !== "SIMULATED_RESEARCH") {
    return sourceRef?.trim() ? normalizeSourceRef(sourceRef) : null;
  }

  let ref = sourceRef?.trim() ? normalizeSourceRef(sourceRef) : "";
  ref = ref.replace(/\s*\(fiktiv\)\s*$/i, "").trim();
  if (!ref) {
    ref = "Simulierte Recherche";
  }
  return `${ref} (fiktiv)`;
}

const competitorResearchStatementSchema = z
  .object({
    competitorAspect: z.enum(COMPETITOR_ASPECTS),
    content: z.string().trim().min(1),
    evidenceStatus: phase1EvidenceStatus,
    origin: phase1Origin,
    justification: z.string().trim().min(1),
    sourceRef: z
      .string()
      .trim()
      .nullish()
      .transform((value) => (value ? normalizeSourceRef(value) : value)),
    uncertainty: z.string().trim().nullish(),
  })
  .transform((data) => ({
    ...data,
    sourceRef: ensureFiktivSourceRef(data.sourceRef, data.origin),
  }))
  .superRefine((data, ctx) => {
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
      data.competitorAspect === "RELEVANCE" &&
      data.evidenceStatus === "FACT"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "RELEVANCE darf nicht als FACT markiert werden (nur ASSUMPTION oder AI_DERIVATION).",
        path: ["evidenceStatus"],
      });
    }
  });

export const competitorResearchResponseSchema = z
  .object({
    statements: z.array(competitorResearchStatementSchema).length(6),
  })
  .superRefine((data, ctx) => {
    const aspects = data.statements.map((statement) => statement.competitorAspect);
    const unique = new Set(aspects);
    if (unique.size !== COMPETITOR_ASPECTS.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Jede Profildimension (competitorAspect) muss genau einmal vorkommen.",
        path: ["statements"],
      });
      return;
    }
    for (const aspect of COMPETITOR_ASPECTS) {
      if (!unique.has(aspect)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Fehlende Profildimension: ${aspect}`,
          path: ["statements"],
        });
      }
    }
  });

export type CompetitorResearchSuggestion = z.infer<
  typeof competitorResearchStatementSchema
>;
