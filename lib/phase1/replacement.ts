import { hashStable } from "./hashing";
import type {
  CompetitorReplacementRequest,
  CompetitorType,
  Phase1AnalysisAnchor,
} from "./types";

export type ReplacementValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateReplacementRequest(options: {
  request: CompetitorReplacementRequest;
  anchor: Phase1AnalysisAnchor;
}): ReplacementValidationResult {
  const { request, anchor } = options;
  const plan = anchor.competitorPlan;
  const invalidCandidate = plan.find(
    (c) => c.candidateId === request.invalidCandidateId
  );

  if (!invalidCandidate) {
    return {
      valid: false,
      reason: `Kandidat ${request.invalidCandidateId} existiert nicht im Analyseanker.`,
    };
  }

  const existingNames = new Set(
    plan.map((c) => c.name.trim().toLowerCase())
  );
  const proposedName = request.proposedReplacement.name.trim().toLowerCase();

  if (existingNames.has(proposedName)) {
    return {
      valid: false,
      reason: `Ersatz "${request.proposedReplacement.name}" ist bereits im Wettbewerberplan.`,
    };
  }

  const similarCandidate = plan.find(
    (c) =>
      c.candidateId !== request.invalidCandidateId &&
      c.name.trim().toLowerCase() === proposedName &&
      c.competitorType === request.proposedReplacement.competitorType
  );
  if (similarCandidate) {
    return {
      valid: false,
      reason: "Name und Typ sind offensichtlich identisch mit einem bestehenden Kandidaten.",
    };
  }

  if (!request.proposedReplacement.relevanceReason.trim()) {
    return {
      valid: false,
      reason: "Ersatz erfüllt keine Marktdefinition — Begründung fehlt.",
    };
  }

  const totalAfterReplace = plan.length;
  if (totalAfterReplace < 6 || totalAfterReplace > 9) {
    return {
      valid: false,
      reason: `Gesamtzahl ${totalAfterReplace} liegt außerhalb 6–9 Akteure.`,
    };
  }

  return { valid: true };
}

export function applyReplacementToAnchor(
  anchor: Phase1AnalysisAnchor,
  request: CompetitorReplacementRequest
): Phase1AnalysisAnchor {
  const invalid = anchor.competitorPlan.find(
    (c) => c.candidateId === request.invalidCandidateId
  );
  if (!invalid) return anchor;

  const newCandidateId =
    request.invalidCandidateId.startsWith("comp-")
      ? request.invalidCandidateId
      : `comp-repl-${hashStable(request.proposedReplacement.name).slice(0, 8)}`;

  const competitorPlan = anchor.competitorPlan.map((candidate) =>
    candidate.candidateId === request.invalidCandidateId
      ? {
          candidateId: newCandidateId,
          name: request.proposedReplacement.name,
          competitorType: request.proposedReplacement
            .competitorType as CompetitorType,
          relevanceReason: request.proposedReplacement.relevanceReason,
          batch: invalid.batch,
        }
      : candidate
  );

  return { ...anchor, competitorPlan };
}

export function buildReplacementRetryPrompt(
  request: CompetitorReplacementRequest,
  rejectionReason: string
): string {
  return `Der vorgeschlagene Ersatz für Kandidat ${request.invalidCandidateId} wurde abgelehnt.
Ablehnungsgrund: ${rejectionReason}
Bitte schlage einen anderen Ersatz vor, der zur Marktdefinition passt und nicht bereits im Plan enthalten ist.`;
}
