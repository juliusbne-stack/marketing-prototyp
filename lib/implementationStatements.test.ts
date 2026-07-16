import { describe, expect, it } from "vitest";
import { buildImplementationStatements } from "./implementationStatements";

describe("buildImplementationStatements", () => {
  it("keeps only the target segment of the prioritized option", () => {
    const statements = buildImplementationStatements(
      [
        {
          statement: {
            id: "opt-target",
            category: "OPT_TARGET_GROUP",
            content: "Diese Option adressiert das Segment 'Kleine Cafes'.",
            evidenceStatus: "ASSUMPTION",
            adopted: true,
            supersededByStatementId: null,
            segmentLabel: "Kleine Cafes",
          },
        },
      ],
      [
        {
          id: "seg-a",
          category: "TARGET_SEGMENT",
          content: "Kleine Cafes bilden ein moegliches Segment.",
          evidenceStatus: "ASSUMPTION",
          segmentLabel: "Kleine Cafes",
          segmentAspect: "WHO_CORE",
        },
        {
          id: "seg-b",
          category: "TARGET_SEGMENT",
          content: "Berufseinsteiger bilden ein anderes Segment.",
          evidenceStatus: "ASSUMPTION",
          segmentLabel: "Berufseinsteiger",
          segmentAspect: "WHO_CORE",
        },
        {
          id: "problem",
          category: "CUSTOMER_PROBLEM",
          content: "Planung wird oft aufgeschoben.",
          evidenceStatus: "ASSUMPTION",
        },
      ]
    );

    expect(statements.map((statement) => statement.id)).toEqual([
      "opt-target",
      "seg-a",
      "problem",
    ]);
  });
});
