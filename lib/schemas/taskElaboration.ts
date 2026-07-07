import { z } from "zod";

const targetingSpezifikationSchema = z.object({
  zielgruppenbeschreibung: z.string().trim().min(1),
  demografie: z.string().trim().min(1),
  geografie: z.string().trim().min(1),
  interessen: z.array(z.string().trim().min(1)),
  platzierung: z.string().trim().min(1),
});

const targetingPresentSchema = z.object({
  vorhanden: z.literal(true),
  spezifikation: targetingSpezifikationSchema,
  basiertAufAussageIds: z.array(z.string().trim().min(1)),
  hinweis: z.string().trim().min(1),
});

const targetingAbsentSchema = z.object({
  vorhanden: z.literal(false),
});

const targetingSchema = z.discriminatedUnion("vorhanden", [
  targetingPresentSchema,
  targetingAbsentSchema,
]);

const schrittSchema = z.object({
  titel: z.string().trim().min(1),
  beschreibung: z.string().trim().min(1),
});

export const taskElaborationResponseSchema = z
  .object({
    einleitungssatz: z.string().trim().min(1),
    schritte: z.array(schrittSchema).min(3).max(5),
    targeting: targetingSchema,
    formulierungsvorschlaege: z.array(z.string().trim().min(1)),
    erfolgskriterium: z.string().trim().min(1),
    benoetigteRessourcen: z.object({
      zeitaufwandGeschaetzt: z.string().trim().min(1),
      tools: z.array(z.string().trim().min(1)),
      budgetanteil: z.string().trim().min(1).nullable(),
    }),
    offeneFragen: z.array(z.string().trim().min(1)),
  })
  .superRefine((data, ctx) => {
    if (data.targeting.vorhanden) {
      if (data.targeting.basiertAufAussageIds.length === 0) {
        ctx.addIssue({
          code: "custom",
          message:
            "basiertAufAussageIds darf bei vorhanden=true nicht leer sein.",
          path: ["targeting", "basiertAufAussageIds"],
        });
      }
    }
  });

export type TaskElaborationResponse = z.infer<
  typeof taskElaborationResponseSchema
>;
