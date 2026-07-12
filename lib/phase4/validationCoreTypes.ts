import type { StrategyDimension } from "@prisma/client";
import type {
  SignalCategoryValue,
  TestSubjectValue,
} from "@/lib/schemas/metric";

/** Internal empirical claim classification — not persisted. */
export type ValidationClaimType =
  | "PROBLEM_RELEVANCE"
  | "NEED"
  | "SEGMENT_FIT"
  | "VALUE_PERCEPTION"
  | "WILLINGNESS_TO_PAY"
  | "REACHABILITY"
  | "CHANNEL_FIT"
  | "ADOPTION_INTENT"
  | "USAGE_BEHAVIOR"
  | "RETENTION"
  | "TRUST"
  | "OTHER";

export type ValidationCore = {
  claimType: ValidationClaimType;
  targetGroup: string;
  claim: string;
  claimedOutcome: string;
  strategicConsequence: string;
  falsificationCondition: string;
  sourceDimension: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
};

export type EvidenceStrength = "WEAK" | "MEDIUM" | "STRONG";

export type EvidenceContract = {
  requiredEvidence: string[];
  minimumStrength: EvidenceStrength;
  acceptableDecisiveSignalTypes: SignalCategoryValue[];
  acceptableSupportingSignalTypes: SignalCategoryValue[];
  invalidAsSoleEvidence: string[];
  recommendedObservationUnit: string;
  qualificationRule: string;
};

export type MethodAvailability =
  | "AVAILABLE"
  | "AVAILABLE_WITH_SETUP"
  | "LIMITED"
  | "EXCLUDED"
  | "UNKNOWN";

export type NormalizedPhase4Constraints = {
  socialMediaPosting: MethodAvailability;
  ownedSocialReach: MethodAvailability;
  directOutreach: MethodAvailability;
  interviews: MethodAvailability;
  surveys: MethodAvailability;
  landingPage: MethodAvailability;
  paidAds: MethodAvailability;
  mvp: MethodAvailability;
  onSite: MethodAvailability;
  communityAccess: MethodAvailability;
  targetGroupAccess: "vorhanden" | "teilweise" | "muss erst aufgebaut werden" | "UNKNOWN";
  budgetLimited: boolean;
  budgetSkipped: boolean;
  weeksLimited: boolean;
  weeksSkipped: boolean;
  budgetEur: number | null;
  weeks: number | null;
  hasWebsite: boolean;
  hasEmailList: boolean;
  hasDirectContacts: boolean;
  canRunAds: boolean;
  canBuildLandingPage: boolean;
  canCreateContent: boolean;
  prefersDiscrete: boolean;
};

export type ValidationMethodCandidate = {
  title: string;
  methodType: string;
  description: string;
  evidenceProduced: string[];
  decisiveSignalType: SignalCategoryValue;
  supportingSignalTypes: SignalCategoryValue[];
  targetGroupAccessPath: string;
  requiredResources: string[];
  requiredMethods: string[];
  requiresOwnedReach: boolean;
  estimatedEffort: "LOW" | "MEDIUM" | "HIGH";
  estimatedEvidenceStrength: EvidenceStrength;
  risks: string[];
};

export type ActivityPurpose =
  | "PREPARE_STIMULUS"
  | "BUILD_ACCESS"
  | "RECRUIT_TARGET_GROUP"
  | "COLLECT_SIGNAL"
  | "DOCUMENT_RESULTS";

export type Phase4ConsistencyIssue = {
  code: string;
  severity: "ERROR" | "WARNING";
  message: string;
  repairInstruction?: string;
};

export type AssumptionInput = {
  id: string;
  content: string;
  justification: string | null;
  uncertainty: string | null;
  strategyDimension: StrategyDimension | null;
  category: string;
};

export type AssumptionPlanning = {
  assumptionId: string;
  validationCore: ValidationCore;
  evidenceContract: EvidenceContract;
  constraints: NormalizedPhase4Constraints;
  primaryTestSubject: TestSubjectValue;
  allowedTestSubjects: TestSubjectValue[];
  candidates: ValidationMethodCandidate[];
  selectedCandidate: ValidationMethodCandidate;
};

/** Maps internal claim types to persisted testSubject enum values. */
export function claimTypeToTestSubject(
  claimType: ValidationClaimType
): TestSubjectValue {
  switch (claimType) {
    case "WILLINGNESS_TO_PAY":
      return "WILLINGNESS_TO_PAY";
    case "REACHABILITY":
    case "CHANNEL_FIT":
      return "REACHABILITY";
    case "PROBLEM_RELEVANCE":
    case "NEED":
      return "PROBLEM_RELEVANCE";
    case "VALUE_PERCEPTION":
    case "ADOPTION_INTENT":
    case "USAGE_BEHAVIOR":
    case "SEGMENT_FIT":
      return "VALUE_UNDERSTANDING";
    case "RETENTION":
    case "TRUST":
      return "OTHER";
    default:
      return "OTHER";
  }
}
