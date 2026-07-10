import { callLLMStructured } from "@/lib/openaiStructured";
import { repairResponseSchema } from "@/lib/schemas/phase1/compact";
import { PHASE1_REPAIR_PROMPT } from "@/lib/prompts/phase1/consistency";
import { buildModuleUserPrompt } from "@/lib/prompts/phase1/shared";
import { phase1Config } from "./config";
import type { Phase1AnalysisAnchor, Phase1ModuleValidationIssue } from "./types";

export async function repairModuleOutput<T>(options: {
  module: string;
  anchor: Phase1AnalysisAnchor;
  invalidResult: unknown;
  issues: Phase1ModuleValidationIssue[];
  validParts?: unknown;
  immutableParts?: string[];
  signal?: AbortSignal;
}): Promise<{ repaired: T | null; repairCount: number }> {
  const userPrompt = buildModuleUserPrompt({
    anchor: options.anchor,
    startupProfile: {},
    moduleTask: `${PHASE1_REPAIR_PROMPT}

Modul: ${options.module}
Fehler:
${options.issues.map((i) => `- [${i.code}] ${i.path}: ${i.message}`).join("\n")}

Ungültiges Ergebnis:
${JSON.stringify(options.invalidResult, null, 2)}

Gültige Teile (nicht ändern):
${JSON.stringify(options.validParts ?? {}, null, 2)}

Nicht verändern: ${(options.immutableParts ?? []).join(", ")}`,
  });

  try {
    const result = await callLLMStructured({
      model: phase1Config.models.repair,
      systemPrompt: PHASE1_REPAIR_PROMPT,
      userPrompt,
      schema: repairResponseSchema,
      schemaName: "phase1_repair",
      signal: options.signal,
      serviceTier: phase1Config.serviceTier,
      module: `repair_${options.module}`,
    });
    const replacement = result.data.repairedObjects[0]?.replacement;
    if (replacement) {
      return { repaired: replacement as T, repairCount: 1 };
    }
    if (result.data.addedObjects.length > 0) {
      return { repaired: result.data.addedObjects as T, repairCount: 1 };
    }
    return { repaired: null, repairCount: 1 };
  } catch {
    return { repaired: null, repairCount: 1 };
  }
}
