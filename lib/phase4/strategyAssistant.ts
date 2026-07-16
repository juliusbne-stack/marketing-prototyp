import type { StatementCategory } from "@prisma/client";
import { CATEGORY_LABELS } from "@/components/statements/categoryLabels";
import type { StatementData } from "@/components/statements/types";
import { stepCopy } from "@/lib/labels/phase4";
import { metricInputSchema } from "@/lib/schemas/metric";
import type {
  Kontext,
  SignalPatchableField,
  StepPatchableField,
  Vorschlag,
} from "@/lib/schemas/strategyAssistant";
import {
  normalizeStepFromApi,
  type AssistantTaskData,
  type StepData,
} from "@/components/phase4/types";

export type AdoptedAussageInput = {
  id: string;
  text: string;
  evidenceStatus: string;
  kategorie: StatementCategory | null;
};

export const STEP_FIELD_LABELS: Record<StepPatchableField, string> = {
  title: "Testtitel",
  description: "Beschreibung",
  channel: "Kanal",
  timeframe: "Dauer",
  budgetFrame: "Budget",
  validationQuestion: "Was muss geprüft werden?",
  testDesign: "Testdesign",
};

export const SIGNAL_FIELD_LABELS: Record<SignalPatchableField, string> = {
  stuetzend: "Stützend wenn",
  widerlegt: "Widerlegend wenn",
};

export type VerificationResult =
  | { ok: true }
  | { ok: false; reason: "drift" | "invalid" };

export function buildStrategyAssistantKontext({
  assumption,
  step,
  tasks,
  adoptedAussagen,
  hasKpiDataPoints = false,
}: {
  assumption: StatementData;
  step: StepData;
  tasks: AssistantTaskData[];
  adoptedAussagen: AdoptedAussageInput[];
  hasKpiDataPoints?: boolean;
}): Kontext {
  return {
    annahme: {
      id: assumption.id,
      text: assumption.content,
      evidenceStatus: assumption.evidenceStatus,
      begruendung: assumption.justification ?? null,
      unsicher: assumption.uncertainty ?? null,
    },
    schritt: {
      id: step.id,
      adopted: step.adopted,
      signaleBearbeitbar: !step.adopted && !hasKpiDataPoints,
      title: step.title,
      description: step.description,
      channel: step.channel,
      timeframe: step.timeframe,
      budgetFrame: step.budgetFrame,
      validationQuestion: step.validationQuestion,
      testDesign: step.testDesign,
    },
    tasks: tasks.map((task) => ({
      id: task.id,
      text: task.text,
      erfolgskriterium: task.erfolgskriterium,
      annahmenBezugId: task.annahmenBezugId,
    })),
    signale: step.metrics.map((metric) => ({
      metricId: metric.id,
      label: metric.name,
      metricRole: metric.metricRole,
      evaluationMode: metric.evaluationMode,
      signalCategory: metric.signalCategory,
      stuetzend: metric.successCriterion,
      widerlegt: metric.failureCriterion,
    })),
    adoptedAussagen: adoptedAussagen.map((entry) => ({
      id: entry.id,
      text: entry.text,
      evidenceStatus: entry.evidenceStatus,
      kategorie: entry.kategorie ? CATEGORY_LABELS[entry.kategorie] : null,
    })),
  };
}

function getStepFieldValue(
  schritt: Kontext["schritt"],
  feld: StepPatchableField
): string | null {
  return schritt[feld];
}

function getSignalFieldValue(
  signal: Kontext["signale"][number],
  feld: SignalPatchableField
): string {
  return feld === "stuetzend" ? signal.stuetzend : signal.widerlegt;
}

function valuesMatch(
  current: string | null,
  vorher: string
): boolean {
  if (current === vorher) return true;
  if (current == null && vorher === "") return true;
  return false;
}

export function verifyStrategyAssistantVorschlag(
  kontext: Kontext,
  vorschlag: Vorschlag
): VerificationResult {
  if (!vorschlag.nachher.trim()) {
    return { ok: false, reason: "invalid" };
  }

  const ziel = vorschlag.ziel;

  if (ziel.typ === "annahme") {
    return valuesMatch(kontext.annahme.text, vorschlag.vorher)
      ? { ok: true }
      : { ok: false, reason: "drift" };
  }

  if (ziel.typ === "task") {
    const task = kontext.tasks.find((entry) => entry.id === ziel.taskId);
    if (!task) return { ok: false, reason: "invalid" };
    const matches =
      valuesMatch(task.text, vorschlag.vorher) ||
      valuesMatch(task.erfolgskriterium ?? null, vorschlag.vorher);
    return matches ? { ok: true } : { ok: false, reason: "drift" };
  }

  if (ziel.typ === "step") {
    const current = getStepFieldValue(kontext.schritt, ziel.feld);
    return valuesMatch(current, vorschlag.vorher)
      ? { ok: true }
      : { ok: false, reason: "drift" };
  }

  if (ziel.typ === "signal") {
    if (!kontext.schritt.signaleBearbeitbar) {
      return { ok: false, reason: "invalid" };
    }
    const signal = kontext.signale.find((entry) => entry.metricId === ziel.metricId);
    if (!signal) return { ok: false, reason: "invalid" };
    const current = getSignalFieldValue(signal, ziel.feld);
    if (!valuesMatch(current, vorschlag.vorher)) {
      return { ok: false, reason: "drift" };
    }
    const stepMetric = {
      name: signal.label,
      evaluationMode: signal.evaluationMode,
      metricRole: signal.metricRole,
      signalCategory: signal.signalCategory ?? undefined,
      successCriterion:
        ziel.feld === "stuetzend" ? vorschlag.nachher : signal.stuetzend,
      failureCriterion:
        ziel.feld === "widerlegt" ? vorschlag.nachher : signal.widerlegt,
    };
    const parsed = metricInputSchema.safeParse(stepMetric);
    return parsed.success ? { ok: true } : { ok: false, reason: "invalid" };
  }

  return { ok: false, reason: "invalid" };
}

export function degradationMessage(reason: "drift" | "invalid"): string {
  if (reason === "drift") {
    return "Der vorgeschlagene Text passt nicht mehr zum aktuellen Kartenstand. Bitte stelle die Frage erneut — es wurde nichts geändert.";
  }
  return (
    "Diesen Vorschlag kann ich so nicht übernehmen. Punktuell änderbar sind: die Annahme, Aufgaben (Text oder Erfolgskriterium), Schrittfelder (Titel, Beschreibung, Kanal, Dauer, Budget, Prüffrage, Testdesign) und Signal-Schwellenwerte (nur bei Entwürfen ohne Kennzahlendaten). Formuliere die Änderung konkret für genau eines dieser Felder — oder nutze „Validierung komplett überarbeiten\" für umfassende Änderungen."
  );
}

export function vorschlagLabel(
  vorschlag: Vorschlag,
  tasks: AssistantTaskData[],
  signale: Kontext["signale"]
): string {
  const ziel = vorschlag.ziel;
  if (ziel.typ === "annahme") return "Vorschlag: Annahme";
  if (ziel.typ === "task") {
    const index = tasks.findIndex((task) => task.id === ziel.taskId);
    return index >= 0 ? `Vorschlag: Aufgabe ${index + 1}` : "Vorschlag: Aufgabe";
  }
  if (ziel.typ === "step") {
    return `Vorschlag: ${STEP_FIELD_LABELS[ziel.feld]}`;
  }
  const signal = signale.find((entry) => entry.metricId === ziel.metricId);
  const signalName = signal?.label ?? "Signal";
  return `Vorschlag: ${signalName} — ${SIGNAL_FIELD_LABELS[ziel.feld]}`;
}

export function buildStepScalarPatchBody(
  step: StepData,
  feld: StepPatchableField,
  nachher: string
) {
  return {
    id: step.id,
    title: step.title,
    description: step.description,
    channel: step.channel ?? null,
    timeframe: step.timeframe,
    budgetFrame: step.budgetFrame,
    validationQuestion: step.validationQuestion,
    testDesign: step.testDesign,
    [feld]: nachher,
  };
}

export function buildSignalMetricsPatchBody(
  step: StepData,
  metricId: string,
  feld: SignalPatchableField,
  nachher: string
) {
  return {
    id: step.id,
    metrics: step.metrics.map((metric) => ({
      name: metric.name,
      evaluationMode: metric.evaluationMode,
      valueType: metric.valueType,
      aggregationStrategy: metric.aggregationStrategy,
      evaluationConfig: metric.evaluationConfig,
      numeratorLabel: metric.numeratorLabel,
      denominatorLabel: metric.denominatorLabel,
      observationUnit: metric.observationUnit,
      metricRole: metric.metricRole,
      signalCategory: metric.signalCategory ?? undefined,
      proxyStrength: metric.proxyStrength,
      signalRationale: metric.signalRationale,
      successCriterion:
        metric.id === metricId && feld === "stuetzend"
          ? nachher
          : metric.successCriterion,
      failureCriterion:
        metric.id === metricId && feld === "widerlegt"
          ? nachher
          : metric.failureCriterion,
    })),
  };
}

export function normalizeStepFromStepsApi(
  step: StepData,
  body: Record<string, unknown>
): StepData {
  return normalizeStepFromApi({
    ...step,
    ...body,
    marketingActivities: body.marketingActivities ?? step.marketingActivities,
  } as StepData & { marketingActivities?: unknown });
}

export function getContextualQuestionChips(stepType: StepData["stepType"]) {
  const signalsLabel = stepCopy(stepType).signalsHeading.toLowerCase();
  return [
    "Warum ist diese Annahme kritisch?",
    "Was passiert bei Widerlegung?",
    "Welche Alternativen gäbe es?",
    `Wie interpretiere ich die ${signalsLabel}?`,
    "Passt das Testdesign zum Budget?",
    "Was fehlt noch für eine klare Prüfung?",
  ];
}
