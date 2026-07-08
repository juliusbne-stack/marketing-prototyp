/**
 * One-off fixture for Thesis evidence run (Punkt 5).
 * Run: npx tsx scripts/setup-phase4-thesis-evidence.ts
 */
import { prisma } from "../lib/prisma";
import {
  buildCandidateWhitelist,
  computeWhitelistDimensionState,
} from "../lib/phase4/guards";
import { getPhase4Mode } from "../lib/phase4/mode";

async function main() {
  const project = await prisma.project.create({
    data: {
      name: `Thesis-Evidenz Phase4 VALIDATION ${new Date().toISOString().slice(0, 16)}`,
      currentPhase: 4,
      businessIdea:
        "B2B-SaaS für automatisierte Nachhaltigkeitsberichte kleiner Mittelständler.",
      productStatus: "MVP",
      assumedTarget: "Produzierende KMU mit 50–250 Mitarbeitern in DACH",
      assumedProblem:
        "CSRD-Pflicht erzeugt hohen manuellen Berichtsaufwand ohne interne Expertise.",
      valuePropDraft:
        "Automatisierte Datenerfassung und auditfähige Berichte in unter 2 Wochen.",
      revenueIdea: "Monatliches Abo nach Unternehmensgröße",
      region: "DACH",
      teamSize: 3,
      budgetMonthly: "500–2000 €",
      timePerWeek: "15 h",
      skills: "LinkedIn, Content, Cold Outreach",
      existingInsights: "3 Pilotgespräche, noch keine zahlenden Kunden",
      profileOnboardingComplete: true,
    },
  });

  const option = await prisma.strategyOption.create({
    data: {
      projectId: project.id,
      title: "Direktvertrieb über LinkedIn + Landingpage",
      summary:
        "Erreichbarkeit und Problemrelevanz über B2B-LinkedIn und eine klare Landingpage testen.",
      status: "PRIORITIZED",
      prioritizationRationale:
        "Geringster Prüfaufwand bei hohem Lernwert für Erreichbarkeit und Problemfit.",
    },
  });

  const [assumptionAccess, openQuestionProblem, factValue] = await Promise.all([
    prisma.statement.create({
      data: {
        projectId: project.id,
        phase: 2,
        category: "OPT_MARKET_ACCESS",
        content:
          "Entscheider in produzierenden KMU sind über LinkedIn und Fachforen erreichbar.",
        evidenceStatus: "ASSUMPTION",
        origin: "AI_DERIVATION",
        adopted: true,
      },
    }),
    prisma.statement.create({
      data: {
        projectId: project.id,
        phase: 2,
        category: "OPT_CUSTOMER_PROBLEM",
        content:
          "CSRD-Berichtspflicht erzeugt bei KMU unter 250 MA akuten Schmerz im Reporting.",
        evidenceStatus: "OPEN_QUESTION",
        origin: "AI_DERIVATION",
        adopted: true,
      },
    }),
    prisma.statement.create({
      data: {
        projectId: project.id,
        phase: 2,
        category: "OPT_VALUE_PROPOSITION",
        content:
          "Automatisierte Berichte sparen mindestens 40 % Zeit gegenüber Excel-Workflows.",
        evidenceStatus: "FACT",
        origin: "USER_INPUT",
        adopted: true,
      },
    }),
  ]);

  await prisma.optionStatement.createMany({
    data: [
      { optionId: option.id, statementId: assumptionAccess.id },
      { optionId: option.id, statementId: openQuestionProblem.id },
      { optionId: option.id, statementId: factValue.id },
    ],
  });

  const mode = await getPhase4Mode(project.id);
  const whitelist = await buildCandidateWhitelist(project.id, "VALIDATION");
  const dimState = computeWhitelistDimensionState(whitelist);

  console.log("FIXTURE_PROJECT_ID=" + project.id);
  console.log("FIXTURE_OPTION_ID=" + option.id);
  console.log("FIXTURE_FACT_ID=" + factValue.id);
  console.log("phase4Mode=" + mode);
  console.log("whitelistDimensionState=" + dimState);
  console.log("WHITELIST:");
  for (const candidate of whitelist) {
    console.log(
      `  ${candidate.id} | ${candidate.evidenceStatus} | ${candidate.category} | strategyDimension=${candidate.strategyDimension}`
    );
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
