/**
 * Self-test script for PhaseInput feature (run while dev server is up).
 * Usage: node scripts/selftest-phase-input.mjs
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

async function main() {
  const project = await prisma.project.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });
  assert(project, "project found");
  const projectId = project.id;
  console.log(`Project: ${project.name} (${projectId})`);

  const phase2Page = await fetch(`${BASE}/project/${projectId}/phase/2`);
  assert(phase2Page.ok, "Phase 2 page loads (HTTP 200)");
  const phase2Html = await phase2Page.text();
  assert(
    phase2Html.includes("Rahmenbedingungen") ||
      phase2Html.includes("Strategieoptionen"),
    "Phase 2 page renders questionnaire or options UI"
  );

  const p2Save = await api("/api/phase-inputs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      phase: 2,
      entries: [
        {
          questionKey: "p2_ausschluss",
          value: "kein B2B/Firmenkunden",
          skipped: false,
        },
        { questionKey: "p2_kernangebot", value: null, skipped: true },
        { questionKey: "p2_eigene_option", value: null, skipped: true },
      ],
      onboarding: { stepIndex: 2, complete: true },
    }),
  });
  assert(p2Save.ok, "Phase 2 exclusion saved via API");

  const p2Get = await api(
    `/api/phase-inputs?projectId=${projectId}&phase=2`,
    { method: "GET" }
  );
  assert(
    p2Get.body?.answers?.p2_ausschluss?.value === "kein B2B/Firmenkunden",
    "p2_ausschluss persisted correctly"
  );
  assert(
    p2Get.body?.answers?.p2_kernangebot?.skipped === true,
    "p2_kernangebot skipped state persisted"
  );

  const p2AllSkip = await api("/api/phase-inputs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      phase: 2,
      entries: [
        { questionKey: "p2_ausschluss", value: null, skipped: true },
        { questionKey: "p2_kernangebot", value: null, skipped: true },
        { questionKey: "p2_eigene_option", value: null, skipped: true },
      ],
      onboarding: { stepIndex: 2, complete: true },
    }),
  });
  assert(p2AllSkip.ok, "Phase 2 all-skipped saved");

  const p4Methods = {
    interviews: "nein",
    umfrage: "ja",
    landingpage: "egal",
    anzeigen: "egal",
    social: "egal",
    mvp: "egal",
    vor_ort: "egal",
  };
  const p4Save = await api("/api/phase-inputs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      phase: 4,
      entries: [
        { questionKey: "p4_methoden", value: p4Methods, skipped: false },
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
          value: "muss erst aufgebaut werden",
          skipped: false,
        },
        {
          questionKey: "p4_kapazitaet",
          value: { team: "allein", skills: ["Kann Content erstellen"] },
          skipped: false,
        },
        { questionKey: "p4_oeffentlichkeit", value: null, skipped: true },
      ],
      onboarding: { stepIndex: 5, complete: true },
    }),
  });
  assert(p4Save.ok, "Phase 4 inputs saved");

  const p4Get = await api(
    `/api/phase-inputs?projectId=${projectId}&phase=4`,
    { method: "GET" }
  );
  assert(
    p4Get.body?.answers?.p4_methoden?.value?.interviews === "nein",
    "p4_methoden interviews=nein persisted"
  );
  assert(
    p4Get.body?.answers?.p4_budget_zeit?.value?.budgetSkipped === true,
    "p4_budget_zeit budget skipped persisted"
  );
  assert(
    p4Get.body?.answers?.p4_zielgruppen_zugang?.value ===
      "muss erst aufgebaut werden",
    "p4_zielgruppen_zugang persisted"
  );

  const dbRows = await prisma.phaseInput.findMany({
    where: { projectId, phase: 4, questionKey: "p4_methoden" },
  });
  assert(dbRows.length === 1, "PhaseInput row in database");

  await api("/api/phase-inputs", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      phase: 2,
      entries: [
        {
          questionKey: "p2_ausschluss",
          value: "kein Marktplatz-Modell",
          skipped: false,
        },
      ],
      onboarding: { stepIndex: 2, complete: true },
    }),
  });
  const p2Reload = await api(
    `/api/phase-inputs?projectId=${projectId}&phase=2`,
    { method: "GET" }
  );
  assert(
    p2Reload.body?.answers?.p2_ausschluss?.value === "kein Marktplatz-Modell",
    "Edited answer reloaded (F10/F11 editability)"
  );

  const phase4Page = await fetch(`${BASE}/project/${projectId}/phase/4`);
  assert(phase4Page.ok, "Phase 4 page loads (HTTP 200)");
  const phase4Html = await phase4Page.text();
  assert(
    phase4Html.includes("Rahmenbedingungen") ||
      phase4Html.includes("Validierung"),
    "Phase 4 page renders questionnaire or validation UI"
  );

  const records = await prisma.phaseInput.count({ where: { projectId } });
  assert(records >= 4, `PhaseInput records exist in DB (${records})`);

  console.log("\nAll automated self-tests passed.");
  console.log(
    "Hinweis: LLM-Generierungstests (B2B-Ausschluss, Interview-Alternativen) erfordern manuelles Klicken im Browser mit OPENAI_API_KEY."
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
