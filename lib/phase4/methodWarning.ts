const BUDGET_ZEIT_NOTE_SUFFIX =
  " nicht angegeben (deine Angabe) — Schritte konservativ dimensioniert.";

function stripBudgetZeitNote(
  warning: string,
  field: "Budget" | "Zeitrahmen"
): string {
  const combined = `Budget und Zeitrahmen${BUDGET_ZEIT_NOTE_SUFFIX}`;
  const single = `${field}${BUDGET_ZEIT_NOTE_SUFFIX}`;

  if (field === "Zeitrahmen") {
    return warning
      .replace(combined, `Budget${BUDGET_ZEIT_NOTE_SUFFIX}`)
      .replace(single, "");
  }

  return warning
    .replace(combined, `Zeitrahmen${BUDGET_ZEIT_NOTE_SUFFIX}`)
    .replace(single, "");
}

function normalizeMethodWarning(warning: string): string | null {
  const trimmed = warning.replace(/\s{2,}/g, " ").trim();
  return trimmed || null;
}

/** Clears budget/timeframe constraint notes after the user sets values on the step card. */
export function resolveMethodWarningAfterFrameEdit(
  methodWarning: string | null,
  edits: { timeframe?: string | null; budgetFrame?: string | null }
): string | null {
  if (!methodWarning) return null;

  let result = methodWarning;

  if (edits.timeframe?.trim()) {
    result = stripBudgetZeitNote(result, "Zeitrahmen");
  }

  if (edits.budgetFrame?.trim()) {
    result = stripBudgetZeitNote(result, "Budget");
  }

  return normalizeMethodWarning(result);
}

const OPEN_BUDGET_PLACEHOLDER = "Budget offen (deine Angabe)";

const ZUGANG_TEILWEISE_NOTE =
  "Zielgruppen-Zugang nur teilweise vorhanden (deine Angabe).";
const ZUGANG_AUFBAU_NOTE =
  "Zielgruppen-Zugang muss erst aufgebaut werden (deine Angabe) — kein direkter Kontakt vorausgesetzt.";

type StepContentForWarning = {
  title?: string;
  description?: string;
  testDesign?: string | null;
  marketingActivities?: string[] | null;
};

function stepContentText(step: StepContentForWarning): string {
  return [
    step.title ?? "",
    step.description ?? "",
    step.testDesign ?? "",
    ...(step.marketingActivities ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function stepAddressesAccessBuildup(step: StepContentForWarning): boolean {
  return /zugang|reichweite|kontakt aufbau|reichweiten|zielgruppe erreichen|anzeigen|ads|werbung/i.test(
    stepContentText(step)
  );
}

function stripZugangEchoNotes(
  warning: string,
  step: StepContentForWarning
): string {
  let result = warning.replace(ZUGANG_TEILWEISE_NOTE, "");
  if (stepAddressesAccessBuildup(step)) {
    result = result.replace(ZUGANG_AUFBAU_NOTE, "");
  }
  return result;
}

/** Hides stale budget/timeframe notes when the step card already shows concrete values. */
export function resolveMethodWarningForDisplay(
  methodWarning: string | null,
  step: StepContentForWarning & {
    timeframe: string | null;
    budgetFrame: string | null;
  }
): string | null {
  if (!methodWarning) return null;

  let result = resolveMethodWarningAfterFrameEdit(methodWarning, {
    timeframe: step.timeframe,
    budgetFrame: step.budgetFrame?.includes(OPEN_BUDGET_PLACEHOLDER)
      ? null
      : step.budgetFrame,
  });
  if (!result) return null;

  result = stripZugangEchoNotes(result, step);
  return normalizeMethodWarning(result);
}
