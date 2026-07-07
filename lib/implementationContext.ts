import type { EvidenceStatus, StatementCategory } from "@prisma/client";
import type { ImplementationStatement } from "./implementationStatements";

const COPY_TARGET_GROUP_CATEGORIES: StatementCategory[] = [
  "OPT_TARGET_GROUP",
  "TARGET_SEGMENT",
];
const COPY_PROBLEM_CATEGORIES: StatementCategory[] = [
  "OPT_CUSTOMER_PROBLEM",
  "CUSTOMER_PROBLEM",
];
const COPY_VALUE_CATEGORIES: StatementCategory[] = ["OPT_VALUE_PROPOSITION"];
const COPY_POSITIONING_CATEGORIES: StatementCategory[] = ["OPT_POSITIONING"];
const COPY_MARKET_ACCESS_CATEGORIES: StatementCategory[] = [
  "OPT_MARKET_ACCESS",
  "MARKET_PATH",
];

function pickStatementsForCopy(
  statements: ImplementationStatement[],
  categories: StatementCategory[]
) {
  return statements
    .filter((statement) => categories.includes(statement.category))
    .map((statement) => ({
      id: statement.id,
      kategorie: statement.category,
      text: statement.content,
    }));
}

/** Copy-relevant context extracted for formulierungsvorschlaege in task elaboration. */
export function buildCopyBasis(
  adoptedStatements: ImplementationStatement[],
  startupProfile: ReturnType<typeof buildStartupProfile>,
  channel: string | null
) {
  return {
    kanal: channel,
    angebot: startupProfile.angebot,
    region: startupProfile.standortRegion,
    zielgruppe: pickStatementsForCopy(
      adoptedStatements,
      COPY_TARGET_GROUP_CATEGORIES
    ),
    kundenproblem: pickStatementsForCopy(
      adoptedStatements,
      COPY_PROBLEM_CATEGORIES
    ),
    nutzenversprechen: pickStatementsForCopy(
      adoptedStatements,
      COPY_VALUE_CATEGORIES
    ),
    positionierung: pickStatementsForCopy(
      adoptedStatements,
      COPY_POSITIONING_CATEGORIES
    ),
    marktzugang: pickStatementsForCopy(
      adoptedStatements,
      COPY_MARKET_ACCESS_CATEGORIES
    ),
  };
}

type StepContext = {
  title: string;
  description: string;
  channel: string | null;
  timeframe: string | null;
  budgetFrame: string | null;
  status: string;
  testedAssumption: {
    content: string;
    evidenceStatus: EvidenceStatus;
  };
  goal: string | null;
  metrics: {
    name: string;
    successCriterion: string;
    failureCriterion: string;
  }[];
};

type TaskContext = {
  id: string;
  title: string;
  hint: string | null;
  erfolgskriterium: string | null;
  annahmenBezug: {
    id: string;
    content: string;
    evidenceStatus: EvidenceStatus;
  } | null;
};

export function buildTaskElaborationContext(input: {
  step: StepContext;
  task: TaskContext;
  adoptedStatements: ImplementationStatement[];
  missingCategories: string[];
  startupProfile: Record<string, unknown>;
  siblingTaskTitles: string[];
}) {
  const copyBasis = buildCopyBasis(
    input.adoptedStatements,
    input.startupProfile as ReturnType<typeof buildStartupProfile>,
    input.step.channel
  );

  return {
    massnahmenkarte: {
      titel: input.step.title,
      beschreibung: input.step.description,
      kanal: input.step.channel,
      gepruefteAnnahme: input.step.testedAssumption.content,
      gepruefteAnnahmeEvidenzstatus: input.step.testedAssumption.evidenceStatus,
      zeitraum: input.step.timeframe,
      budgetConstraint: input.step.budgetFrame,
      zielErfolgskriterien: input.step.goal,
      status: input.step.status,
      kennzahlen: input.step.metrics,
    },
    aufgabe: {
      id: input.task.id,
      titel: input.task.title,
      unterzeile: input.task.hint,
      erfolgskriterium: input.task.erfolgskriterium,
      annahmenBezug: input.task.annahmenBezug,
    },
    uebernommeneAussagenMitEvidenzstatus: input.adoptedStatements.map(
      (statement) => ({
        id: statement.id,
        kategorie: statement.category,
        text: statement.content,
        evidenzstatus: statement.evidenceStatus,
      })
    ),
    fehlendeAussagenKategorien: input.missingCategories,
    startupKontext: input.startupProfile,
    copyBasis,
    geschwisterAufgabenTitel: input.siblingTaskTitles,
  };
}

export function getMissingImplementationCategories(
  statements: ImplementationStatement[]
): string[] {
  const hasTargetGroup = statements.some(
    (statement) =>
      statement.category === "OPT_TARGET_GROUP" ||
      statement.category === "TARGET_SEGMENT"
  );
  const missing: string[] = [];
  if (!hasTargetGroup) {
    missing.push("Zielgruppe");
  }
  return missing;
}

export function buildStartupProfile(project: {
  businessIdea: string | null;
  productStatus: string | null;
  assumedTarget: string | null;
  assumedProblem: string | null;
  valuePropDraft: string | null;
  region: string | null;
  budgetMonthly: string | null;
}) {
  return {
    angebot: project.businessIdea,
    produktstatus: project.productStatus,
    vermuteteZielgruppe: project.assumedTarget,
    vermutetesKundenproblem: project.assumedProblem,
    nutzenversprechen: project.valuePropDraft,
    standortRegion: project.region,
    budgetrahmen: project.budgetMonthly,
  };
}
