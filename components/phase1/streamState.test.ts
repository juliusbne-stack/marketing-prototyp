import { describe, expect, it } from "vitest";
import {
  reduceStreamEvent,
  INITIAL_STREAM_STATE,
  sortPreviewStatements,
  hasPercentProgress,
} from "./streamState";
import type { Phase1Statement } from "@/lib/schemas/phase1";

const stmt = (content: string): Phase1Statement => ({
  category: "PESTEL_TECHNOLOGICAL",
  content,
  evidenceStatus: "ASSUMPTION",
  origin: "AI_DERIVATION",
  justification: "test",
  sourceRef: null,
});

describe("streamState reducer", () => {
  it("analysis_started sets loading", () => {
    const next = reduceStreamEvent(INITIAL_STREAM_STATE, {
      type: "analysis_started",
      runId: "run-1",
    });
    expect(next.isLoading).toBe(true);
    expect(next.previewStatements).toHaveLength(0);
  });

  it("module_started updates status line", () => {
    const next = reduceStreamEvent(INITIAL_STREAM_STATE, {
      type: "module_started",
      module: "pestel",
      label: "Umfeldanalyse läuft",
    });
    expect(next.statusText).toBe("Umfeldanalyse läuft");
  });

  it("deduplicates statements by previewId", () => {
    let state = reduceStreamEvent(INITIAL_STREAM_STATE, {
      type: "statement",
      module: "pestel",
      previewId: "pestel-0",
      data: stmt("A"),
    });
    state = reduceStreamEvent(state, {
      type: "statement",
      module: "pestel",
      previewId: "pestel-0",
      data: stmt("B"),
    });
    expect(state.previewStatements).toHaveLength(1);
    expect(state.previewStatements[0].statement.content).toBe("A");
  });

  it("module_repair_started shows repair status", () => {
    const next = reduceStreamEvent(INITIAL_STREAM_STATE, {
      type: "module_repair_started",
      module: "segments",
      affectedItems: ["segments.SMB"],
    });
    expect(next.statusText).toContain("Reparatur");
  });

  it("synthesis_started shows synthesis status", () => {
    const next = reduceStreamEvent(INITIAL_STREAM_STATE, {
      type: "synthesis_started",
    });
    expect(next.statusText).toContain("SWOT");
  });

  it("final clears preview and ends loading", () => {
    let state = reduceStreamEvent(INITIAL_STREAM_STATE, {
      type: "analysis_started",
      runId: "run-1",
    });
    state = reduceStreamEvent(state, {
      type: "statement",
      module: "pestel",
      previewId: "pestel-0",
      data: stmt("A"),
    });
    state = reduceStreamEvent(state, {
      type: "final",
      data: { statements: [], pestelRelevance: [] },
    });
    expect(state.isLoading).toBe(false);
    expect(state.previewStatements).toHaveLength(0);
    expect(state.finalData).not.toBeNull();
  });

  it("error ends loading", () => {
    let state = reduceStreamEvent(INITIAL_STREAM_STATE, {
      type: "analysis_started",
      runId: "run-1",
    });
    state = reduceStreamEvent(state, {
      type: "error",
      recoverable: true,
      message: "Fehler",
    });
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe("Fehler");
  });

  it("module_completed reused shows cache status", () => {
    const next = reduceStreamEvent(INITIAL_STREAM_STATE, {
      type: "module_completed",
      module: "pestel",
      itemCount: 5,
      reused: true,
    });
    expect(next.statusText).toContain("Cache");
  });

  it("sortPreviewStatements is deterministic", () => {
    const sorted = sortPreviewStatements([
      { previewId: "pestel-2", statement: stmt("C") },
      { previewId: "pestel-0", statement: stmt("A") },
      { previewId: "pestel-1", statement: stmt("B") },
    ]);
    expect(sorted.map((s) => s.previewId)).toEqual([
      "pestel-0",
      "pestel-1",
      "pestel-2",
    ]);
  });

  it("does not emit percent progress", () => {
    expect(hasPercentProgress("Umfeldanalyse läuft")).toBe(false);
    expect(hasPercentProgress("45% fertig")).toBe(true);
  });
});
