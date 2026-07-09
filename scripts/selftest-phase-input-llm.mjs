/**
 * LLM integration self-tests (requires OPENAI_API_KEY + adopted Phase 1 statements).
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

const B2B_PATTERN = /b2b|firmenkund|unternehmenskund|business.to.business/i;

async function savePhase2Inputs(projectId, entries) {
  const res = await fetch(`${BASE}/api/phase-inputs`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      phase: 2,
      entries,
      onboarding: { stepIndex: 2, complete: true },
    }),
  });
  if (!res.ok) throw new Error(`phase-inputs PATCH failed: ${res.status}`);
}

async function generatePhase2(projectId) {
  console.log("Calling /api/ai/2 (may take 30–90s) …");
  const res = await fetch(`${BASE}/api/ai/2`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Phase 2 generation failed: ${res.status} ${body?.error ?? ""}`);
  }
  return body.options ?? [];
}

async function main() {
  const project = await prisma.project.findFirst({
    where: {
      statements: { some: { phase: 1, adopted: true } },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });
  if (!project) {
    console.log("SKIP: No project with adopted Phase 1 statements.");
    return;
  }
  const projectId = project.id;
  console.log(`LLM tests on: ${project.name}`);

  // Test 1: B2B exclusion
  await savePhase2Inputs(projectId, [
    {
      questionKey: "p2_ausschluss",
      value: "kein B2B/Firmenkunden",
      skipped: false,
    },
    { questionKey: "p2_kernangebot", value: null, skipped: true },
    { questionKey: "p2_eigene_option", value: null, skipped: true },
  ]);
  const optionsExcluded = await generatePhase2(projectId);
  assert(optionsExcluded.length >= 2, `Generated ${optionsExcluded.length} options`);
  const b2bHits = optionsExcluded.filter(
    (opt) =>
      B2B_PATTERN.test(opt.title) ||
      B2B_PATTERN.test(opt.summary) ||
      (opt.statements ?? []).some((s) => B2B_PATTERN.test(s.content))
  );
  assert(
    b2bHits.length === 0,
    `No B2B options when excluded (found ${b2bHits.length})`
  );

  // Test 2: all skipped — should still generate
  await savePhase2Inputs(projectId, [
    { questionKey: "p2_ausschluss", value: null, skipped: true },
    { questionKey: "p2_kernangebot", value: null, skipped: true },
    { questionKey: "p2_eigene_option", value: null, skipped: true },
  ]);
  const optionsOpen = await generatePhase2(projectId);
  assert(optionsOpen.length >= 2, "Generation works with all inputs skipped");

  console.log("\nLLM Phase 2 self-tests passed.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
