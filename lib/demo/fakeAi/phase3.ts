import { prisma } from "@/lib/prisma";
import { DEMO_FIXTURE } from "@/scripts/demo-fixture-data";
import { demoDelay } from "@/lib/demo/delay";

export async function serveDemoPhase3(projectId: string) {
  await demoDelay(800);

  const options = await prisma.strategyOption.findMany({
    where: {
      projectId,
      status: { in: ["ADOPTED", "PRIORITIZED", "DEFERRED"] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });

  if (options.length < 2) {
    throw new DemoAiPreconditionError(
      "Für die Bewertung müssen mindestens zwei Optionen aus Phase 2 in den Projektstand übernommen sein."
    );
  }

  const optionIdByFixtureKey = new Map<string, string>();
  for (const fixture of Object.values(DEMO_FIXTURE.options)) {
    const live = options.find((option) => option.title === fixture.title);
    if (live) optionIdByFixtureKey.set(fixture.key, live.id);
  }

  const missing = Object.values(DEMO_FIXTURE.options).filter(
    (fixture) => !optionIdByFixtureKey.has(fixture.key)
  );
  if (missing.length > 0) {
    // Fallback: map by creation order if titles were edited.
    Object.values(DEMO_FIXTURE.options).forEach((fixture, index) => {
      const live = options[index];
      if (live) optionIdByFixtureKey.set(fixture.key, live.id);
    });
  }

  const recommendationOptionId = optionIdByFixtureKey.get("option1");
  if (!recommendationOptionId) {
    throw new DemoAiPreconditionError(
      "Die Demo-Empfehlung konnte keiner Option zugeordnet werden."
    );
  }

  const evaluations = await prisma.$transaction(async (tx) => {
    await tx.evaluation.deleteMany({
      where: { optionId: { in: options.map((option) => option.id) } },
    });

    const rows = Object.values(DEMO_FIXTURE.evaluations)
      .map((evaluation) => {
        const optionId = optionIdByFixtureKey.get(evaluation.optionKey);
        if (!optionId) return null;
        return {
          optionId,
          criterion: evaluation.criterion,
          score: evaluation.score,
          rationale: evaluation.rationale,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    await tx.evaluation.createMany({ data: rows });

    return tx.evaluation.findMany({
      where: { optionId: { in: options.map((option) => option.id) } },
      select: {
        id: true,
        optionId: true,
        criterion: true,
        score: true,
        rationale: true,
      },
    });
  });

  const fixtureOption1 = DEMO_FIXTURE.options.option1;

  return {
    evaluations,
    recommendation: {
      optionId: recommendationOptionId,
      rationale:
        fixtureOption1?.prioritizationRationale ??
        "Option 1 wird als zuerst zu validierende Stoßrichtung empfohlen.",
      counterArguments:
        "Option 2 adressiert ein breiteres Segment, ist aber unschärfer im Nutzenversprechen und schwerer fokussiert zu testen. Option 3 passt stark zur veganen Identität, begrenzt jedoch die erreichbare Nachfrage und macht Preis- sowie Skalierungstests enger.",
    },
  };
}

export class DemoAiPreconditionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoAiPreconditionError";
  }
}
