import { describe, expect, it } from "vitest";

const fixtureDurations = {
  anchor: 1000,
  pestel: 3000,
  segments: 4000,
  resources: 2000,
  competitorBatch1: 5000,
  competitorBatch2: 6000,
  competitorBatch3: 5500,
  synthesis: 2500,
  consistency: 1000,
};

function monolithicDuration() {
  return (
    fixtureDurations.pestel +
    fixtureDurations.segments +
    fixtureDurations.resources +
    fixtureDurations.competitorBatch1 +
    fixtureDurations.competitorBatch2 +
    fixtureDurations.competitorBatch3 +
    fixtureDurations.synthesis
  );
}

function modularDuration() {
  const parallelCore = Math.max(
    fixtureDurations.pestel,
    fixtureDurations.segments,
    fixtureDurations.resources,
    fixtureDurations.competitorBatch1,
    fixtureDurations.competitorBatch2,
    fixtureDurations.competitorBatch3
  );
  return (
    fixtureDurations.anchor +
    parallelCore +
    fixtureDurations.synthesis +
    fixtureDurations.consistency
  );
}

describe("fixture performance simulation", () => {
  it("expects modular path to be shorter than monolithic serial sum", () => {
    const monolith = monolithicDuration();
    const modular = modularDuration();
    expect(modular).toBeLessThan(monolith);
    expect(monolith).toBe(28000);
    expect(modular).toBe(10500);
  });
});
