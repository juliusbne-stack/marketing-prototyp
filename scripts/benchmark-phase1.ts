#!/usr/bin/env tsx
/**
 * Live benchmark — only runs with explicit env confirmation.
 * Default: fixture simulation only.
 */

const fixtureDurations = {
  anchor: 1000,
  pestel: 3000,
  segments: 4000,
  resources: 2000,
  competitorBatch1: 5000,
  competitorBatch2: 6000,
  competitorBatch3: 5500,
  synthesis: 2500,
  consistency: 1000,
};

function simulateModularMs() {
  const parallel = Math.max(
    fixtureDurations.pestel,
    fixtureDurations.segments,
    fixtureDurations.resources,
    fixtureDurations.competitorBatch1,
    fixtureDurations.competitorBatch2,
    fixtureDurations.competitorBatch3
  );
  return (
    fixtureDurations.anchor +
    parallel +
    fixtureDurations.synthesis +
    fixtureDurations.consistency
  );
}

function simulateMonolithicMs() {
  return (
    fixtureDurations.pestel +
    fixtureDurations.segments +
    fixtureDurations.resources +
    fixtureDurations.competitorBatch1 +
    fixtureDurations.competitorBatch2 +
    fixtureDurations.competitorBatch3 +
    fixtureDurations.synthesis
  );
}

async function main() {
  const live = process.env.RUN_PHASE1_LIVE_BENCHMARK === "true";
  if (!live) {
    console.log("Live-Benchmark wurde nicht gestartet.");
    console.log(
      "Setze RUN_PHASE1_LIVE_BENCHMARK=true, um kostenpflichtige API-Aufrufe ausdrücklich freizugeben."
    );
    console.log("");
    console.log("Fixture-Simulation (keine echten API-Messung):");
    console.log(`- Monolithisch (seriell): ${simulateMonolithicMs()} ms`);
    console.log(`- Modular (parallelisiert): ${simulateModularMs()} ms`);
    console.log(
      "Hinweis: Dies ist eine Simulation, keine echte OpenAI-Laufzeit."
    );
    return;
  }

  const maxProjects = Number(process.env.PHASE1_BENCHMARK_MAX_PROJECTS ?? 2);
  const runsPerProject = Number(
    process.env.PHASE1_BENCHMARK_RUNS_PER_PROJECT ?? 1
  );
  const maxRepairs = Number(
    process.env.PHASE1_BENCHMARK_MAX_REPAIRS_PER_MODULE ?? 1
  );
  const maxRequests = Number(
    process.env.PHASE1_BENCHMARK_MAX_TOTAL_REQUESTS ?? 25
  );

  const modulesPerProject = 9;
  const plannedRequests = maxProjects * runsPerProject * modulesPerProject;

  console.log("Kostenvorschau (Schätzung):");
  console.log(`- Projekte: ${maxProjects}`);
  console.log(`- Durchläufe je Projekt: ${runsPerProject}`);
  console.log(`- Module je Projekt: ${modulesPerProject}`);
  console.log(`- Max. Reparaturen je Modul: ${maxRepairs}`);
  console.log(`- Geplante API-Aufrufe: ${plannedRequests}`);
  console.log("- Modelle: PHASE1_MODEL_* oder gpt-4o Default");
  console.log(
    "Hinweis: Tatsächliche Kosten und Tokenwerte können abweichen."
  );

  if (plannedRequests > maxRequests) {
    console.error(
      `Abbruch: Geplante Aufrufe (${plannedRequests}) überschreiten PHASE1_BENCHMARK_MAX_TOTAL_REQUESTS=${maxRequests}.`
    );
    process.exit(1);
  }

  const nonInteractive =
    process.env.CONFIRM_PHASE1_LIVE_BENCHMARK === "BENCHMARK";
  if (!nonInteractive) {
    console.log("");
    console.log(
      `Dieser Benchmark führt voraussichtlich ${plannedRequests} kostenpflichtige API-Aufrufe aus.`
    );
    console.log("Zum Fortfahren BENCHMARK eingeben:");
    console.log(
      "(In CI/non-interactive: setze CONFIRM_PHASE1_LIVE_BENCHMARK=BENCHMARK)"
    );
    process.exit(1);
  }

  console.log("Live-Benchmark ist freigegeben, wird aber in dieser Version nicht automatisch ausgeführt.");
  console.log("Nutze die Anwendung manuell für einen Smoke-Test mit echten API-Aufrufen.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
