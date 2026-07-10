import { describe, expect, it } from "vitest";
import { runWithConcurrencyLimit } from "@/lib/phase1/concurrency";

describe("runWithConcurrencyLimit", () => {
  it("runs tasks with bounded concurrency", async () => {
    let active = 0;
    let maxActive = 0;
    const tasks = Array.from({ length: 6 }, (_, index) => async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20 - index));
      active -= 1;
      return index;
    });

    const results = await runWithConcurrencyLimit(tasks, 2, (task) => task());
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});
