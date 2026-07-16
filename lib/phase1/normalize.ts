import type { CompactStatement } from "@/lib/schemas/phase1/compact";
import type { Phase1Statement } from "@/lib/schemas/phase1";
import { phase1StatementSchema } from "@/lib/schemas/phase1";

type ProfileMeta = {
  segmentLabel?: string;
  competitorLabel?: string;
  defaultSourceRef?: string | null;
};

function applyProfileDefaults(
  statement: CompactStatement,
  profile: ProfileMeta
): CompactStatement {
  return {
    ...statement,
    segmentLabel: statement.segmentLabel ?? profile.segmentLabel ?? null,
    competitorLabel: statement.competitorLabel ?? profile.competitorLabel ?? null,
    sourceRef:
      statement.sourceRef ??
      profile.defaultSourceRef ??
      statement.sourceRef,
  };
}

export function normalizeCompactStatement(
  statement: CompactStatement,
  profile?: ProfileMeta
): Phase1Statement {
  const merged = profile ? applyProfileDefaults(statement, profile) : statement;
  const parsed = phase1StatementSchema.parse(merged);
  return parsed;
}

export function normalizeCompactStatements(
  statements: CompactStatement[],
  profile?: ProfileMeta
): Phase1Statement[] {
  return statements.map((statement) =>
    normalizeCompactStatement(statement, profile)
  );
}

export function normalizeSegmentProfile(profile: {
  segmentLabel: string;
  defaultSourceRef?: string | null;
  statements: CompactStatement[];
}): Phase1Statement[] {
  return profile.statements.map((statement) =>
    normalizeCompactStatement(
      { ...statement, category: "TARGET_SEGMENT" },
      {
        segmentLabel: profile.segmentLabel,
        defaultSourceRef: profile.defaultSourceRef,
      }
    )
  );
}

export function normalizeCompetitorProfile(profile: {
  name: string;
  defaultSourceRef?: string | null;
  statements: CompactStatement[];
}): Phase1Statement[] {
  return profile.statements.map((statement) =>
    normalizeCompactStatement(
      { ...statement, category: "COMPETITOR" },
      {
        competitorLabel: profile.name,
        defaultSourceRef: profile.defaultSourceRef,
      }
    )
  );
}

export function normalizeSwotStatement(
  statement: CompactStatement & { derivedFrom?: string[] | null }
): Phase1Statement {
  return normalizeCompactStatement(statement);
}

export function normalizePhase1ModuleOutput(statements: CompactStatement[]): Phase1Statement[] {
  return normalizeCompactStatements(statements);
}
