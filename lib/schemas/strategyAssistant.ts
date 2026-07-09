import { z } from "zod";

export const nachrichtSchema = z.object({
  rolle: z.enum(["user", "assistant"]),
  inhalt: z.string(),
});

/** Scalar ValidationStep fields writable via PATCH /api/steps (without metrics). */
export const stepPatchableFieldSchema = z.enum([
  "title",
  "description",
  "channel",
  "timeframe",
  "budgetFrame",
  "validationQuestion",
  "testDesign",
]);

export const signalPatchableFieldSchema = z.enum(["stuetzend", "widerlegt"]);

export const kontextSchema = z.object({
  annahme: z.object({
    id: z.string(),
    text: z.string(),
    evidenceStatus: z.string(),
    begruendung: z.string().nullable().optional(),
    unsicher: z.string().nullable().optional(),
  }),
  schritt: z.object({
    id: z.string(),
    adopted: z.boolean(),
    signaleBearbeitbar: z.boolean(),
    title: z.string(),
    description: z.string(),
    channel: z.string().nullable(),
    timeframe: z.string().nullable(),
    budgetFrame: z.string().nullable(),
    validationQuestion: z.string().nullable(),
    testDesign: z.string().nullable(),
  }),
  tasks: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      erfolgskriterium: z.string().nullable().optional(),
      annahmenBezugId: z.string().nullable().optional(),
    })
  ),
  signale: z.array(
    z.object({
      metricId: z.string(),
      label: z.string(),
      metricRole: z.string(),
      evaluationMode: z.string(),
      signalCategory: z.string().nullable().optional(),
      stuetzend: z.string(),
      widerlegt: z.string(),
    })
  ),
  adoptedAussagen: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      evidenceStatus: z.string(),
      kategorie: z.string().nullable().optional(),
    })
  ),
});

export const strategyAssistantRequestSchema = z.object({
  kontext: kontextSchema,
  verlauf: z.array(nachrichtSchema),
});

export const zielSchema = z.discriminatedUnion("typ", [
  z.object({ typ: z.literal("annahme") }),
  z.object({ typ: z.literal("task"), taskId: z.string() }),
  z.object({
    typ: z.literal("step"),
    feld: stepPatchableFieldSchema,
  }),
  z.object({
    typ: z.literal("signal"),
    metricId: z.string(),
    feld: signalPatchableFieldSchema,
  }),
]);

export const vorschlagSchema = z.object({
  ziel: zielSchema,
  vorher: z.string(),
  nachher: z.string().min(1),
  begruendung: z.string(),
});

export const assistentAntwortSchema = z.discriminatedUnion("modus", [
  z.object({
    modus: z.literal("antwort"),
    nachricht: z.string(),
  }),
  z.object({
    modus: z.literal("vorschlag"),
    nachricht: z.string(),
    vorschlag: vorschlagSchema,
  }),
]);

export type StepPatchableField = z.infer<typeof stepPatchableFieldSchema>;
export type SignalPatchableField = z.infer<typeof signalPatchableFieldSchema>;
export type Nachricht = z.infer<typeof nachrichtSchema>;
export type Kontext = z.infer<typeof kontextSchema>;
export type AssistentAntwort = z.infer<typeof assistentAntwortSchema>;
export type Vorschlag = z.infer<typeof vorschlagSchema>;
export type Ziel = z.infer<typeof zielSchema>;
