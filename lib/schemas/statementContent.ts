import { z } from "zod";

/** Conservative intention markers — safety net; prompts carry the main rule. */
const INTENTION_CONTENT_PATTERNS: RegExp[] = [
  /^ziel ist/i,
  /wir (wollen|planen|streben)/i,
  /\bsoll\b.*\bwerden\b/i,
  /abzuschöpfen/i,
];

export function hasIntentionFormulation(content: string): boolean {
  return INTENTION_CONTENT_PATTERNS.some((pattern) => pattern.test(content));
}

export function intentionValidationMessage(statementLabel: string): string {
  return `${statementLabel} ist eine Absichtsformulierung. Formuliere sie als prüfbare Behauptung über Zielgruppe oder Markt um.`;
}

export function validateStatementContentNotIntention(
  content: string,
  ctx: z.RefinementCtx,
  path: (string | number)[],
  statementLabel: string
): void {
  if (hasIntentionFormulation(content)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: intentionValidationMessage(statementLabel),
      path,
    });
  }
}
