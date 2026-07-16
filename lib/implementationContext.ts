import type { EvidenceStatus, StatementCategory } from "@prisma/client";
import type { ImplementationStatement } from "./implementationStatements";
import { taskElaborationResponseSchema } from "./schemas/taskElaboration";

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
      evidenzstatus: statement.evidenceStatus,
      segmentLabel: statement.segmentLabel ?? null,
      segmentAspect: statement.segmentAspect ?? null,
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
  stepTasks: Array<{
    id: string;
    title: string;
    hint: string | null;
    sortOrder: number;
    elaboration: unknown;
  }>;
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
    aufgabenReihenfolgeImSchritt: buildCopyRefineStepContext(
      input.task.id,
      input.stepTasks
    ),
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

/** Ordered step tasks with prior copy for copy-refinement relevance checks. */
export function buildCopyRefineStepContext(
  currentTaskId: string,
  stepTasks: Array<{
    id: string;
    title: string;
    hint: string | null;
    sortOrder: number;
    elaboration: unknown;
  }>
) {
  const ordered = [...stepTasks].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentIndex = ordered.findIndex((task) => task.id === currentTaskId);

  const extractFormulierungen = (elaboration: unknown) => {
    const parsed = taskElaborationResponseSchema.safeParse(elaboration);
    return parsed.success ? parsed.data.formulierungsvorschlaege : [];
  };

  return {
    position: currentIndex + 1,
    gesamtAnzahl: ordered.length,
    vorherigeAufgaben: ordered.slice(0, currentIndex).map((task, index) => ({
      position: index + 1,
      titel: task.title,
      unterzeile: task.hint,
      formulierungsvorschlaege: extractFormulierungen(task.elaboration),
    })),
    nachfolgendeAufgaben: ordered.slice(currentIndex + 1).map((task, index) => ({
      position: currentIndex + index + 2,
      titel: task.title,
      unterzeile: task.hint,
    })),
  };
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
