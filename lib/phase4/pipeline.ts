import type { PhaseInputState } from "@/lib/phaseInput/types";
import type { TestSubjectValue } from "@/lib/schemas/metric";
import type { Phase4LlmResponse, Phase4StepOutput } from "@/lib/schemas/phase4";
import { buildTopCandidates } from "./candidates";
import {
  constraintsToLlmSummary,
  normalizePhase4Constraints,
} from "./constraints";
import { buildEvidenceContract } from "./evidenceContract";
import type { WhitelistCandidate } from "./guards";
import {
  checkAssumptionPlanning,
  checkValidationStepConsistency,
} from "./consistencyCheck";
import {
  claimTypeToTestSubject,
  type AssumptionPlanning,
  type Phase4ConsistencyIssue,
} from "./validationCoreTypes";
import {
  checkTestability,
  deriveValidationCore,
  detectCompoundClaims,
} from "./validationCore";
import {
  deriveAllowedDecisiveTestSubjects,
  derivePrimaryTestSubject,
} from "./testSubjectDerivation";

export type Phase4PlanningBundle = {
  constraints: ReturnType<typeof normalizePhase4Constraints>;
  constraintsSummary: Record<string, string>;
  perAssumption: Map<string, AssumptionPlanning>;
  compoundClaimErrors: Phase4ConsistencyIssue[];
};

export function buildPhase4Planning(
  whitelist: WhitelistCandidate[],
  phaseInputState: PhaseInputState | null | undefined
): Phase4PlanningBundle {
  const constraints = normalizePhase4Constraints(phaseInputState);
  const constraintsSummary = constraintsToLlmSummary(constraints);
  const perAssumption = new Map<string, AssumptionPlanning>();
  const compoundClaimErrors: Phase4ConsistencyIssue[] = [];

  for (const candidate of whitelist) {
    const assumptionInput = {
      id: candidate.id,
      content: candidate.content,
      justification: candidate.justification,
      uncertainty: candidate.uncertainty,
      strategyDimension: candidate.strategyDimension,
      category: candidate.category,
    };

    const compound = detectCompoundClaims(assumptionInput);
    if (compound) {
      compoundClaimErrors.push(compound);
      continue;
    }

    const testability = checkTestability(assumptionInput);
    if (testability) {
      compoundClaimErrors.push(testability);
      continue;
    }

    const validationCore = deriveValidationCore(assumptionInput);
    const evidenceContract = buildEvidenceContract(validationCore);
    const primaryTestSubject = derivePrimaryTestSubject(
      assumptionInput,
      validationCore
    );
    const allowedTestSubjects = deriveAllowedDecisiveTestSubjects(
      assumptionInput,
      validationCore
    );
    const { all, filtered, selected } = buildTopCandidates(
      validationCore,
      constraints
    );

    perAssumption.set(candidate.id, {
      assumptionId: candidate.id,
      validationCore,
      evidenceContract,
      constraints,
      primaryTestSubject,
      allowedTestSubjects,
      candidates: filtered.length > 0 ? filtered : all,
      selectedCandidate: selected,
    });
  }

  return { constraints, constraintsSummary, perAssumption, compoundClaimErrors };
}

export function planningToLlmContext(bundle: Phase4PlanningBundle) {
  return {
    nutzerbedingungen: bundle.constraintsSummary,
    annahmenPlanung: [...bundle.perAssumption.entries()].map(
      ([id, planning]) => ({
        assumptionId: id,
        validationCore: planning.validationCore,
        evidenceContract: {
          requiredEvidence: planning.evidenceContract.requiredEvidence,
          minimumStrength: planning.evidenceContract.minimumStrength,
          acceptableDecisiveSignalTypes:
            planning.evidenceContract.acceptableDecisiveSignalTypes,
          invalidAsSoleEvidence:
            planning.evidenceContract.invalidAsSoleEvidence,
          recommendedObservationUnit:
            planning.evidenceContract.recommendedObservationUnit,
        },
        primaryTestSubject: planning.primaryTestSubject,
        allowedTestSubjects: planning.allowedTestSubjects,
        interneKandidaten: planning.candidates.map((c) => ({
          title: c.title,
          methodType: c.methodType,
          evidenceProduced: c.evidenceProduced,
          targetGroupAccessPath: c.targetGroupAccessPath,
          estimatedEvidenceStrength: c.estimatedEvidenceStrength,
        })),
        ausgewaehlterTestansatz: {
          title: planning.selectedCandidate.title,
          description: planning.selectedCandidate.description,
          targetGroupAccessPath:
            planning.selectedCandidate.targetGroupAccessPath,
          decisiveSignalType: planning.selectedCandidate.decisiveSignalType,
          evidenceProduced: planning.selectedCandidate.evidenceProduced,
        },
        planungsregel:
          "Erzeuge den sichtbaren ValidationStep aus dem ausgewählten Testansatz. testSubject = primaryTestSubject. Keine interne Prozesssprache.",
      })
    ),
  };
}

export function applyPlanningToSteps(
  result: Phase4LlmResponse,
  bundle: Phase4PlanningBundle
): Phase4LlmResponse {
  return {
    ...result,
    steps: result.steps.map((step) => {
      const planning = bundle.perAssumption.get(step.assumptionId);
      if (!planning) return step;

      const testSubject =
        planning.allowedTestSubjects.includes(step.testSubject)
          ? step.testSubject
          : planning.primaryTestSubject;

      return {
        ...step,
        testSubject: testSubject as TestSubjectValue,
      };
    }),
  };
}

export function collectConsistencyIssuesForResult(
  steps: (Phase4StepOutput & { methodWarning?: string | null })[],
  bundle: Phase4PlanningBundle
): { stepIndex: number; issues: Phase4ConsistencyIssue[] }[] {
  const collected: { stepIndex: number; issues: Phase4ConsistencyIssue[] }[] =
    [];

  steps.forEach((step, stepIndex) => {
    const planning = bundle.perAssumption.get(step.assumptionId);
    if (!planning) return;
    const issues = checkValidationStepConsistency(
      step,
      planning,
      bundle.constraints
    );
    if (issues.length > 0) {
      collected.push({ stepIndex, issues });
    }
  });

  return collected;
}

export function hasStructuralConsistencyErrors(
  collected: { stepIndex: number; issues: Phase4ConsistencyIssue[] }[]
): boolean {
  return collected.some((entry) =>
    entry.issues.some((issue) => issue.severity === "ERROR")
  );
}

export function formatConsistencyRepairHints(
  collected: { stepIndex: number; issues: Phase4ConsistencyIssue[] }[]
): string {
  return collected
    .flatMap((entry) =>
      entry.issues
        .filter((i) => i.severity === "ERROR")
        .map(
          (i) =>
            `${i.code}: ${i.message}${i.repairInstruction ? ` → ${i.repairInstruction}` : ""}`
        )
    )
    .join("\n");
}

export { checkAssumptionPlanning, claimTypeToTestSubject };
