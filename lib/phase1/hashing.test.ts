import { describe, expect, it } from "vitest";
import { hashStable } from "@/lib/phase1/hashing";

describe("hashStable", () => {
  it("is deterministic regardless of key order", () => {
    const a = hashStable({ b: 2, a: 1, nested: { z: 3, y: 2 } });
    const b = hashStable({ nested: { y: 2, z: 3 }, a: 1, b: 2 });
    expect(a).toBe(b);
  });

  it("changes when values change", () => {
    const a = hashStable({ teamSize: 2 });
    const b = hashStable({ teamSize: 3 });
    expect(a).not.toBe(b);
  });
});
