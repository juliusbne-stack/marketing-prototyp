import type { Phase1StreamEvent } from "@/lib/phase1/events";
import type { Phase1Statement } from "@/lib/schemas/phase1";

export type StreamPreviewState = {
  isLoading: boolean;
  statusText: string | null;
  previewStatements: Array<{ previewId: string; statement: Phase1Statement }>;
  finalData: unknown | null;
  error: string | null;
};

export const INITIAL_STREAM_STATE: StreamPreviewState = {
  isLoading: false,
  statusText: null,
  previewStatements: [],
  finalData: null,
  error: null,
};

export function reduceStreamEvent(
  state: StreamPreviewState,
  event: Phase1StreamEvent
): StreamPreviewState {
  switch (event.type) {
    case "analysis_started":
      return {
        ...state,
        isLoading: true,
        statusText: null,
        previewStatements: [],
        finalData: null,
        error: null,
      };
    case "module_started":
      return { ...state, statusText: event.label };
    case "anchor_started":
      return { ...state, statusText: "Analysegrundlage wird erstellt" };
    case "synthesis_started":
      return {
        ...state,
        statusText: "SWOT und Marktpfade werden abgeleitet",
      };
    case "module_repair_started":
      return {
        ...state,
        statusText: `Reparatur: ${event.module}`,
      };
    case "consistency_check_started":
      return { ...state, statusText: "Analyse wird auf Konsistenz geprüft" };
    case "persisting":
      return { ...state, statusText: "Analyse wird gespeichert" };
    case "warning":
      return { ...state, statusText: event.message };
    case "statement": {
      const exists = state.previewStatements.some(
        (p) => p.previewId === event.previewId
      );
      if (exists) return state;
      return {
        ...state,
        previewStatements: [
          ...state.previewStatements,
          { previewId: event.previewId, statement: event.data as Phase1Statement },
        ],
      };
    }
    case "module_completed":
      if (event.reused) {
        return {
          ...state,
          statusText: `${event.module} (aus Cache)`,
        };
      }
      return state;
    case "final":
      return {
        ...state,
        isLoading: false,
        finalData: event.data,
        previewStatements: [],
        statusText: null,
      };
    case "error":
      return {
        ...state,
        isLoading: false,
        error: event.message,
        statusText: null,
      };
    default:
      return state;
  }
}

/** Deterministic sort for final statement display order. */
export function sortPreviewStatements(
  statements: Array<{ previewId: string; statement: Phase1Statement }>
): Array<{ previewId: string; statement: Phase1Statement }> {
  return [...statements].sort((a, b) => a.previewId.localeCompare(b.previewId));
}

export function hasPercentProgress(statusText: string | null): boolean {
  if (!statusText) return false;
  return /\d+\s*%/.test(statusText);
}
