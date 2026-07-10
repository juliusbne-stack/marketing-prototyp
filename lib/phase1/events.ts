import type { Phase1ModuleKey } from "./types";
import type { PestelRelevance } from "@/lib/schemas/phase1";
import type { StatementData } from "@/components/statements/types";

export type PreviewStatement = {
  category: string;
  content: string;
  evidenceStatus: string;
  origin: string;
  justification: string;
  sourceRef?: string | null;
  uncertainty?: string | null;
  segmentLabel?: string | null;
  segmentAspect?: string | null;
  competitorLabel?: string | null;
  competitorAspect?: string | null;
};

export type PreviewProfile = {
  profileType: "segment" | "competitor";
  label: string;
  description?: string;
};

export type FinalPhase1Result = {
  statements: StatementData[];
  pestelRelevance: PestelRelevance[];
  incremental?: boolean;
  filteredDuplicateCount?: number;
};

export const PHASE1_MODULE_LABELS: Record<Phase1ModuleKey, string> = {
  anchor: "Analysegrundlage wird erstellt",
  pestel: "Umfeldanalyse läuft",
  segments: "Zielgruppen werden analysiert",
  resources: "Ressourcen werden eingeordnet",
  competitors_batch_1: "Wettbewerber 1–3 werden untersucht",
  competitors_batch_2: "Wettbewerber 4–6 werden untersucht",
  competitors_batch_3: "Weitere Alternativen werden untersucht",
  synthesis: "SWOT und Marktpfade werden abgeleitet",
};

export type Phase1StreamEvent =
  | { type: "analysis_started"; runId: string }
  | { type: "anchor_started" }
  | { type: "anchor_completed" }
  | { type: "module_started"; module: Phase1ModuleKey; label: string }
  | {
      type: "statement";
      module: Phase1ModuleKey;
      previewId: string;
      data: PreviewStatement;
    }
  | {
      type: "profile";
      module: Phase1ModuleKey;
      previewId: string;
      data: PreviewProfile;
    }
  | {
      type: "module_completed";
      module: Phase1ModuleKey;
      itemCount: number;
      reused?: boolean;
    }
  | {
      type: "module_repair_started";
      module: Phase1ModuleKey;
      affectedItems: string[];
    }
  | { type: "synthesis_started" }
  | { type: "synthesis_completed" }
  | { type: "consistency_check_started" }
  | { type: "persisting" }
  | { type: "final"; data: FinalPhase1Result }
  | { type: "warning"; module?: Phase1ModuleKey; message: string }
  | {
      type: "error";
      recoverable: boolean;
      module?: Phase1ModuleKey;
      message: string;
    };
