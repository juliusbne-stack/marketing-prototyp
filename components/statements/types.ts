import type {
  EvidenceStatus,
  Origin,
  StatementCategory,
} from "@prisma/client";

// Client-side shape of a statement, matching the select in app/api/statements/route.ts
export type StatementData = {
  id: string;
  projectId: string;
  phase: number;
  category: StatementCategory;
  content: string;
  evidenceStatus: EvidenceStatus;
  origin: Origin;
  justification: string | null;
  sourceRef: string | null;
  uncertainty: string | null;
  isCritical: boolean;
  adopted: boolean;
  segmentLabel: string | null;
  segmentAspect: string | null;
  competitorLabel: string | null;
  competitorAspect: string | null;
};
