import { z } from "zod";
import { OPTION_DIMENSION_CATEGORIES } from "./phase2";
import { optionDimensionEvidenceStatus } from "./evidenceStatus";
import { validateStatementContentNotIntention } from "./statementContent";

// Zod schema for the phase 2 revision mode (after an ADAPT decision in phase 5).
const dimensionCategory = z.enum(OPTION_DIMENSION_CATEGORIES);

const revisionSchema = z.object({
  dimensionCategory,
  content: z.string().trim().min(1),
  // Revised dimensions are never FACT — they still await market validation.
  evidenceStatus: optionDimensionEvidenceStatus,
  justification: z.string().trim().min(1),
  uncertainty: z.string().trim().nullish(),
  // Only OPT_TARGET_GROUP revisions carry the addressed segment's label; the
  // route validates it against the phase 1 segment labels in the context.
  segmentLabel: z.string().trim().min(1).nullish(),
});

const unchangedSchema = z.object({
  dimensionCategory,
  reason: z.string().trim().min(1),
});

export const phase2RevisionResponseSchema = z
  .object({
    revisions: z.array(revisionSchema),
    unchanged: z.array(unchangedSchema),
  })
  .refine((data) => {
    const categories = [
      ...data.revisions.map((revision) => revision.dimensionCategory),
      ...data.unchanged.map((entry) => entry.dimensionCategory),
    ];
    return (
      categories.length === OPTION_DIMENSION_CATEGORIES.length &&
      OPTION_DIMENSION_CATEGORIES.every((category) =>
        categories.includes(category)
      )
    );
  }, "Jede der 6 Dimensionen muss genau einmal vorkommen — entweder in revisions oder in unchanged.")
  .superRefine((data, ctx) => {
    data.revisions.forEach((revision, index) => {
      validateStatementContentNotIntention(
        revision.content,
        ctx,
        ["revisions", index, "content"],
        `Aussage ${index + 1} (${revision.dimensionCategory})`
      );
    });
  });

export type Phase2RevisionResponse = z.infer<
  typeof phase2RevisionResponseSchema
>;
