import { createHash } from "node:crypto";

function stableSortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableSortValue);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = stableSortValue(record[key]);
    }
    return sorted;
  }
  return value;
}

export function hashStable(value: unknown): string {
  const serialized = JSON.stringify(stableSortValue(value));
  return createHash("sha256").update(serialized).digest("hex");
}

export function createRunId(): string {
  return `p1-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPreviewId(
  module: string,
  index: number,
  suffix?: string
): string {
  return `preview-${module}-${index}${suffix ? `-${suffix}` : ""}`;
}
