/**
 * Phase 4 LLM integration self-tests.
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

const INTERVIEW_PATTERN = /interview|gespräch|befragung/i;

async function savePhase4Inputs(projectId, entries) {
  const res = await fetch(`${BASE}/api/phase-inputs`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      phase: 4,
      entries,
      onboarding: { stepIndex: 5, complete: true },
    }),
  });
  if (!res.ok) throw new Error(`phase-inputs PATCH failed: ${res.status}`);
}

async function generatePhase4(projectId) {
  console.log("Calling /api/ai/4 (may take 30–90s) …");
  const res = await fetch(`${BASE}/api/ai/4`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Phase 4 generation failed: ${res.status} ${body?.error ?? ""}`);
  }
  return body.steps ?? [];
}

async function main() {
  const project = await prisma.project.findFirst({
    where: {
      options: { some: { status: "PRIORITIZED" } },
      statements: { some: { phase: 1, adopted: true } },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });
  if (!project) {
    console.log("SKIP: No project with prioritized option.");
    return;
  }
  const projectId = project.id;
  console.log(`Phase 4 LLM tests on: ${project.name}`);

  const baseMethods = {
    umfrage: "ja",
    landingpage: "egal",
    anzeigen: "egal",
    social: "egal",
    mvp: "egal",
    vor_ort: "egal",
  };

  // Test 3: interviews = nein
  await savePhase4Inputs(projectId, [
    {
      questionKey: "p4_methoden",
      value: { ...baseMethods, interviews: "nein" },
      skipped: false,
    },
    {
      questionKey: "p4_budget_zeit",
      value: {
        budgetEur: 300,
        budgetSkipped: false,
        weeks: 4,
        weeksSkipped: false,
      },
      skipped: false,
    },
    {
      questionKey: "p4_assets",
      value: { selected: ["Website"], sonstiges: "" },
      skipped: false,
    },
    {
      questionKey: "p4_zielgruppen_zugang",
      value: "vorhanden",
      skipped: false,
    },
    {
      questionKey: "p4_kapazitaet",
      value: { team: "allein", skills: ["Kann Content erstellen"] },
      skipped: false,
    },
    { questionKey: "p4_oeffentlichkeit", value: null, skipped: true },
  ]);

  const stepsNoInterview = await generatePhase4(projectId);
  assert(stepsNoInterview.length >= 1, `Generated ${stepsNoInterview.length} steps`);
  const interviewSteps = stepsNoInterview.filter(
    (step) =>
      INTERVIEW_PATTERN.test(step.title) ||
      INTERVIEW_PATTERN.test(step.description) ||
      (step.marketingActivities ?? []).some((a) => INTERVIEW_PATTERN.test(a))
  );
  assert(
    interviewSteps.length === 0,
    `No interview tasks when excluded (found ${interviewSteps.length})`
  );
  console.log("OK: interviews excluded — steps contain no interview tasks");

  // Test 4: budget skipped
  await savePhase4Inputs(projectId, [
    {
      questionKey: "p4_methoden",
      value: { ...baseMethods, interviews: "egal" },
      skipped: false,
    },
    {
      questionKey: "p4_budget_zeit",
      value: {
        budgetEur: null,
        budgetSkipped: true,
        weeks: 3,
        weeksSkipped: false,
      },
      skipped: false,
    },
    {
      questionKey: "p4_assets",
      value: { selected: ["Website"], sonstiges: "" },
      skipped: false,
    },
    {
      questionKey: "p4_zielgruppen_zugang",
      value: "vorhanden",
      skipped: false,
    },
    {
      questionKey: "p4_kapazitaet",
      value: { team: "allein", skills: [] },
      skipped: false,
    },
    { questionKey: "p4_oeffentlichkeit", value: null, skipped: true },
  ]);

  const stepsBudgetSkip = await generatePhase4(projectId);
  const inventedBudget = stepsBudgetSkip.some((step) =>
    /€\s*\d{3,}|euro\s*\d{3,}/i.test(step.budgetFrame ?? "")
  );
  assert(
    !inventedBudget || stepsBudgetSkip.some((s) => s.methodWarning?.includes("Budget")),
    "Budget skipped: no invented large budget or warning present"
  );
  const hasOpenBudgetHint = stepsBudgetSkip.some(
    (step) =>
      step.methodWarning?.toLowerCase().includes("budget") ||
      (step.budgetFrame ?? "").toLowerCase().includes("offen")
  );
  assert(hasOpenBudgetHint, "Budget skipped: open question/hint visible");

  // Test 5: zielgruppen zugang muss aufgebaut werden
  await savePhase4Inputs(projectId, [
    {
      questionKey: "p4_methoden",
      value: { ...baseMethods, interviews: "egal" },
      skipped: false,
    },
    {
      questionKey: "p4_budget_zeit",
      value: {
        budgetEur: 200,
        budgetSkipped: false,
        weeks: 4,
        weeksSkipped: false,
      },
      skipped: false,
    },
    {
      questionKey: "p4_assets",
      value: { selected: ["Social-Media-Reichweite"], sonstiges: "" },
      skipped: false,
    },
    {
      questionKey: "p4_zielgruppen_zugang",
      value: "muss erst aufgebaut werden",
      skipped: false,
    },
    {
      questionKey: "p4_kapazitaet",
      value: { team: "allein", skills: ["Kann Content erstellen"] },
      skipped: false,
    },
    { questionKey: "p4_oeffentlichkeit", value: null, skipped: true },
  ]);

  const stepsZugang = await generatePhase4(projectId);
  const hasAccessStep = stepsZugang.some(
    (step) =>
      step.methodWarning?.includes("Zielgruppen-Zugang") ||
      /reichweite|zugang|aufbau|kontakt aufbau/i.test(
        `${step.title} ${step.description} ${step.testDesign}`
      )
  );
  assert(
    hasAccessStep,
    "Zielgruppen-Zugang 'muss aufgebaut werden': Aufbauschritt or warning present"
  );

  console.log("\nLLM Phase 4 self-tests passed.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
