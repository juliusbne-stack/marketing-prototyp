import { describe, it, expect } from "vitest";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import {
  anchorSchema,
  pestelModuleSchema,
  segmentsModuleSchema,
  resourcesModuleSchema,
  competitorsBatchSchema,
  synthesisModuleSchema,
  consistencyResponseSchema,
  repairResponseSchema,
} from "./compact";

/**
 * Every schema passed to callLLMStructured is converted to a strict JSON schema
 * via zodResponseFormat before the request goes out. Strict mode rejects any
 * `.optional()` field that is not also `.nullable()` — use `.nullish()` instead.
 * This guards against that whole class of "fataler Fehler in der modularen
 * Orchestrierung" that only surfaces at runtime otherwise.
 */
const structuredOutputSchemas: Array<[string, z.ZodType]> = [
  ["anchor", anchorSchema],
  ["pestel", pestelModuleSchema],
  ["segments", segmentsModuleSchema],
  ["resources", resourcesModuleSchema],
  ["competitorsBatch", competitorsBatchSchema],
  [
    "singleCompetitorProfile",
    z.object({ profile: competitorsBatchSchema.shape.profiles.element }),
  ],
  ["synthesis", synthesisModuleSchema],
  ["consistency", consistencyResponseSchema],
  ["repair", repairResponseSchema],
];

describe("phase1 structured-output schemas", () => {
  it.each(structuredOutputSchemas)(
    "%s converts to a strict JSON schema without throwing",
    (name, schema) => {
      expect(() => zodResponseFormat(schema, name)).not.toThrow();
    }
  );
});
