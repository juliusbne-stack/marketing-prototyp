import { z } from "zod";

export const copyRefineResponseSchema = z.object({
  formulierungsvorschlaege: z.array(z.string().trim().min(1)).min(2).max(3),
});

export type CopyRefineResponse = z.infer<typeof copyRefineResponseSchema>;

export const copyRefineRequestSchema = z.object({
  feedback: z.string().trim().min(1),
  previousRounds: z
    .array(
      z.object({
        feedback: z.string().trim().min(1),
        resultPreview: z.string().trim().min(1),
      })
    )
    .default([]),
});
