// Segment profile dimensions for TARGET_SEGMENT statements (Phase 1).
export const SEGMENT_ASPECTS = [
  "DESCRIPTION",
  "PROBLEM_NEED",
  "BEHAVIOR_CONTEXT",
  "WILLINGNESS_TO_PAY",
  "REACHABILITY",
] as const;

export type SegmentAspect = (typeof SEGMENT_ASPECTS)[number];

export const SEGMENT_ASPECT_LABELS: Record<SegmentAspect, string> = {
  DESCRIPTION: "Wer",
  PROBLEM_NEED: "Problem & Bedarf",
  BEHAVIOR_CONTEXT: "Verhalten & Kontext",
  WILLINGNESS_TO_PAY: "Zahlungsbereitschaft",
  REACHABILITY: "Erreichbarkeit",
};

export function isSegmentAspect(value: string): value is SegmentAspect {
  return (SEGMENT_ASPECTS as readonly string[]).includes(value);
}
