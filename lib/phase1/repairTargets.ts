import type { Phase1ModuleKey, Phase1ModuleValidationIssue } from "./types";

export type SegmentRepairTarget =
  | {
      type: "REPLACE_SEGMENT";
      segmentId: string;
      issues: Phase1ModuleValidationIssue[];
    }
  | {
      type: "ADD_MISSING_ASPECT";
      segmentId: string;
      aspectCategory: string;
      issues: Phase1ModuleValidationIssue[];
    }
  | {
      type: "ADD_MISSING_SEGMENT";
      expectedRole: string;
      issues: Phase1ModuleValidationIssue[];
    };

export type ResourceRepairTarget =
  | {
      type: "ADD_MISSING_CATEGORY";
      category: string;
      issues: Phase1ModuleValidationIssue[];
    }
  | {
      type: "REPLACE_STATEMENT";
      statementIndex: number;
      issues: Phase1ModuleValidationIssue[];
    };

export type CompetitorRepairTarget =
  | {
      type: "REPLACE_PROFILE";
      candidateId: string;
      issues: Phase1ModuleValidationIssue[];
    }
  | {
      type: "ADD_MISSING_ASPECT";
      candidateId: string;
      aspectCategory: string;
      issues: Phase1ModuleValidationIssue[];
    };

export type SynthesisRepairTarget =
  | { type: "REPLACE_SWOT"; category: string; issues: Phase1ModuleValidationIssue[] }
  | {
      type: "REPLACE_MARKET_PATH";
      pathIndex: number;
      issues: Phase1ModuleValidationIssue[];
    }
  | {
      type: "FIX_DERIVED_FROM";
      objectId: string;
      issues: Phase1ModuleValidationIssue[];
    }
  | { type: "REPLACE_ALL"; issues: Phase1ModuleValidationIssue[] };

export type Phase1ConsistencyRepairTarget = {
  module: Phase1ModuleKey;
  objectId: string;
  issueType: string;
  explanation: string;
  repairInstruction: string;
};

export function buildSegmentRepairTargets(
  issues: Phase1ModuleValidationIssue[]
): SegmentRepairTarget[] {
  const targets: SegmentRepairTarget[] = [];

  for (const issue of issues) {
    if (issue.code === "COUNT" && issue.path === "segments") {
      targets.push({
        type: "ADD_MISSING_SEGMENT",
        expectedRole: "additional",
        issues: [issue],
      });
    } else if (issue.code === "ASPECTS") {
      const match = issue.path.match(/^segments\.(.+)$/);
      if (match) {
        targets.push({
          type: "ADD_MISSING_ASPECT",
          segmentId: match[1],
          aspectCategory: "missing",
          issues: [issue],
        });
      }
    } else if (issue.path.startsWith("segments.")) {
      const segmentId = issue.path.replace("segments.", "");
      if (!targets.some((t) => t.type === "REPLACE_SEGMENT" && t.segmentId === segmentId)) {
        targets.push({
          type: "REPLACE_SEGMENT",
          segmentId,
          issues: [issue],
        });
      }
    }
  }

  return targets;
}

export function buildResourceRepairTargets(
  issues: Phase1ModuleValidationIssue[]
): ResourceRepairTarget[] {
  const targets: ResourceRepairTarget[] = [];
  for (const issue of issues) {
    if (issue.code === "COUNT") {
      targets.push({
        type: "ADD_MISSING_CATEGORY",
        category: "RESOURCE",
        issues: [issue],
      });
    } else if (issue.code === "EMPTY") {
      targets.push({
        type: "REPLACE_STATEMENT",
        statementIndex: 0,
        issues: [issue],
      });
    }
  }
  return targets;
}

export function buildCompetitorRepairTargets(
  issues: Phase1ModuleValidationIssue[]
): CompetitorRepairTarget[] {
  const targets: CompetitorRepairTarget[] = [];
  for (const issue of issues) {
    const profileMatch = issue.path.match(/^profiles\.([^/]+)$/);
    if (profileMatch) {
      const candidateId = profileMatch[1];
      if (issue.code === "ASPECTS") {
        targets.push({
          type: "ADD_MISSING_ASPECT",
          candidateId,
          aspectCategory: "missing",
          issues: [issue],
        });
      } else {
        targets.push({
          type: "REPLACE_PROFILE",
          candidateId,
          issues: [issue],
        });
      }
    } else if (issue.code === "MISSING") {
      const idMatch = issue.path.match(/^profiles\.(.+)$/);
      if (idMatch) {
        targets.push({
          type: "REPLACE_PROFILE",
          candidateId: idMatch[1],
          issues: [issue],
        });
      }
    }
  }
  return targets;
}

export function buildSynthesisRepairTargets(
  issues: Phase1ModuleValidationIssue[]
): SynthesisRepairTarget[] {
  if (issues.length >= 4) {
    return [{ type: "REPLACE_ALL", issues }];
  }

  const targets: SynthesisRepairTarget[] = [];
  for (const issue of issues) {
    if (issue.path.startsWith("swot.")) {
      const category = issue.path.replace("swot.", "");
      targets.push({ type: "REPLACE_SWOT", category, issues: [issue] });
    } else if (issue.path.startsWith("marketPath")) {
      targets.push({
        type: "REPLACE_MARKET_PATH",
        pathIndex: 0,
        issues: [issue],
      });
    } else if (issue.code === "DERIVED_FROM") {
      targets.push({
        type: "FIX_DERIVED_FROM",
        objectId: issue.path,
        issues: [issue],
      });
    }
  }
  return targets.length > 0 ? targets : [{ type: "REPLACE_ALL", issues }];
}

export function buildConsistencyRepairTargets(
  issues: Array<{
    module: string;
    objectId?: string;
    issueType: string;
    explanation: string;
    repairInstruction?: string;
  }>
): Phase1ConsistencyRepairTarget[] {
  return issues
    .filter((i) => i.repairInstruction && i.objectId)
    .map((issue) => ({
      module: issue.module as Phase1ModuleKey,
      objectId: issue.objectId!,
      issueType: issue.issueType,
      explanation: issue.explanation,
      repairInstruction: issue.repairInstruction!,
    }));
}
