import { z } from "zod";
import { P4_ASSET_OPTIONS, P4_SKILL_OPTIONS, P4_VALIDATION_METHODS } from "@/lib/phaseInput/phase4Questions";
import { PHASE2_QUESTIONS } from "@/lib/phaseInput/phase2Questions";
import { PHASE4_QUESTIONS } from "@/lib/phaseInput/phase4Questions";
import { ONBOARDING_META_KEY } from "@/lib/phaseInput/types";

const methodPreferenceSchema = z.enum(["ja", "nein", "egal"]);

const kernangebotSchema = z.object({
  mode: z.enum(["fix", "offen"]),
  detail: z.string().optional(),
});

const budgetZeitSchema = z.object({
  budgetEur: z.number().int().min(0).nullable(),
  budgetSkipped: z.boolean(),
  weeks: z.number().int().min(1).nullable(),
  weeksSkipped: z.boolean(),
});

const assetsSchema = z.object({
  selected: z.array(z.enum(P4_ASSET_OPTIONS)),
  sonstiges: z.string().optional(),
});

const kapazitaetSchema = z.object({
  team: z.enum(["allein", "kleines Team"]),
  skills: z.array(z.enum(P4_SKILL_OPTIONS)),
});

const methodMatrixSchema = z.object(
  Object.fromEntries(
    P4_VALIDATION_METHODS.map((method) => [method.id, methodPreferenceSchema])
  )
);

const phase2AnswerSchemas: Record<string, z.ZodType> = {
  p2_ausschluss: z.string().trim().min(1),
  p2_kernangebot: kernangebotSchema,
  p2_eigene_option: z.string().trim().min(1),
};

const phase4AnswerSchemas: Record<string, z.ZodType> = {
  p4_methoden: methodMatrixSchema,
  p4_budget_zeit: budgetZeitSchema,
  p4_assets: assetsSchema,
  p4_zielgruppen_zugang: z.enum([
    "vorhanden",
    "teilweise",
    "muss erst aufgebaut werden",
  ]),
  p4_kapazitaet: kapazitaetSchema,
  p4_oeffentlichkeit: z.enum([
    "öffentlich unter Marke ok",
    "lieber klein/verdeckt",
  ]),
};

const onboardingMetaSchema = z.object({
  stepIndex: z.number().int().min(0),
  complete: z.boolean(),
});

export const phaseInputEntrySchema = z.object({
  questionKey: z.string().min(1),
  value: z.unknown().nullable(),
  skipped: z.boolean(),
});

export const phaseInputUpsertSchema = z
  .object({
    projectId: z.string().min(1),
    phase: z.union([z.literal(2), z.literal(4)]),
    entries: z.array(phaseInputEntrySchema).min(1),
    onboarding: onboardingMetaSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const schemas = data.phase === 2 ? phase2AnswerSchemas : phase4AnswerSchemas;
    const allowedKeys = new Set([
      ...Object.keys(schemas),
      ONBOARDING_META_KEY,
    ]);

    for (const entry of data.entries) {
      if (!allowedKeys.has(entry.questionKey)) {
        ctx.addIssue({
          code: "custom",
          message: `Unbekannter questionKey: ${entry.questionKey}`,
        });
        continue;
      }
      if (entry.questionKey === ONBOARDING_META_KEY) {
        const parsed = onboardingMetaSchema.safeParse(entry.value);
        if (!parsed.success) {
          ctx.addIssue({
            code: "custom",
            message: "Ungültige Onboarding-Metadaten.",
          });
        }
        continue;
      }
      if (entry.skipped) continue;
      if (entry.value == null) {
        ctx.addIssue({
          code: "custom",
          message: `Wert für ${entry.questionKey} fehlt (nicht übersprungen).`,
        });
        continue;
      }
      const schema = schemas[entry.questionKey];
      const parsed = schema.safeParse(entry.value);
      if (!parsed.success) {
        ctx.addIssue({
          code: "custom",
          message: `Ungültiger Wert für ${entry.questionKey}.`,
        });
      }
    }
  });

export type PhaseInputUpsert = z.infer<typeof phaseInputUpsertSchema>;

export function buildPhaseInputContextBlock(
  phase: 2 | 4,
  answers: Record<
    string,
    { value: unknown; skipped: boolean }
  >
): Record<string, unknown> {
  const questions = phase === 2 ? PHASE2_QUESTIONS : PHASE4_QUESTIONS;
  const result: Record<string, unknown> = {};

  for (const question of questions) {
    const answer = answers[question.key];
    if (!answer) continue;
    if (answer.skipped) {
      result[question.key] = { status: "übersprungen", hinweis: "keine Angabe" };
      continue;
    }
    result[question.key] = question.promptLabel
      ? { beschriftung: question.promptLabel, antwort: answer.value }
      : answer.value;
  }

  return result;
}

export const PHASE2_INPUT_RULES = `VERWERTUNG DER PHASEN-EINGABEN (Rahmenbedingungen, KEINE Aussagen):
- p2_ausschluss: Wenn angegeben, strikt respektieren — keine Optionen generieren, die ausgeschlossene Stoßrichtungen, Zielgruppen oder Geschäftsmodelle betreffen. Bei übersprungen: keine Einschränkung annehmen oder erfinden.
- p2_kernangebot: mode "fix" → Varianten nur innerhalb des gesetzten Kernangebots; mode "offen" → angrenzende Modelle als eigene Optionen erlauben. Bei übersprungen: Divergenz der Optionen erhalten.
- p2_eigene_option: Wenn angegeben, als zusätzliche, ausgearbeitete Option aufnehmen und in title/summary als nutzergesetzt kennzeichnen. Bei übersprungen: ignorieren.
- Übersprungene Felder generell = keine Einschränkung angegeben — niemals erfinden.`;

export const PHASE4_INPUT_RULES = `VERWERTUNG DER PHASEN-EINGABEN (Rahmenbedingungen, KEINE Aussagen):
- p4_methoden: Methoden mit "nein" NICHT verwenden. "nein" = EXCLUDED. "ja" = verfügbar. "egal" = zulässig mit Setup.
- p4_assets ("Für die Validierung eingesetzte Mittel"): Nur angekreuzte Mittel für die Tests einplanen. Nicht angekreuzt bedeutet nicht für die Validierung freigegeben, nicht zwingend nicht vorhanden.
  Wenn "Social-Media-Reichweite" nicht eingesetzt wird, erfordert Social Media einen externen Verbreitungsweg
  auf den eigenen Profil- oder Vertriebskanälen (bestehende Community dort, Direktansprache,
  Partner/Multiplikator/Influencer/Kooperation/Creator, bezahlte Ausspielung/Ads/Anzeigen).
  „Community" meint keine neuen fremden Plattformen.
- p4_budget_zeit: Ressourcensensibel dimensionieren. budgetSkipped → budgetFrame offen kennzeichnen.
- p4_zielgruppen_zugang: "muss erst aufgebaut werden" → keinen direkten Kontakt voraussetzen; Zugangsweg im Test benennen.
- p4_kapazitaet: Schritte müssen mit angegebenen Fähigkeiten ausführbar sein.
- p4_oeffentlichkeit: "lieber klein/verdeckt" → keine großen öffentlichen Marken-Kampagnen.
- Übersprungene Felder = keine Angabe — im Zweifel offene Frage, keine Fakten erfinden.`;
