import { z } from "zod";
import { taskElaborationResponseSchema } from "./taskElaboration";

export const taskElaborationRefineRequestSchema = z.object({
  feedback: z.string().trim().min(1),
  previousRounds: z
    .array(
      z.object({
        feedback: z.string().trim().min(1),
        changeSummary: z.string().trim().min(1),
      })
    )
    .default([]),
});

export const taskElaborationRefineResponseSchema =
  taskElaborationResponseSchema.extend({
    changeSummary: z.string().trim().min(1),
  });

export type TaskElaborationRefineRequest = z.infer<
  typeof taskElaborationRefineRequestSchema
>;
export type TaskElaborationRefineResponse = z.infer<
  typeof taskElaborationRefineResponseSchema
>;
