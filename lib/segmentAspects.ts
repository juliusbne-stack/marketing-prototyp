// Segment profile dimensions for TARGET_SEGMENT statements (Phase 1).
export const SEGMENT_ASPECTS = [
  "WHO_CORE",
  "WHO_DISTINGUISHERS",
  "WHO_BOUNDARY_ROLE",
  "PROBLEM_NEED",
  "BEHAVIOR_CONTEXT",
  "WILLINGNESS_TO_PAY",
  "REACHABILITY",
] as const;

export type SegmentAspect = (typeof SEGMENT_ASPECTS)[number];

export const REQUIRED_GENERATED_SEGMENT_ASPECTS = [
  "WHO_CORE",
  "WHO_DISTINGUISHERS",
  "PROBLEM_NEED",
  "BEHAVIOR_CONTEXT",
  "WILLINGNESS_TO_PAY",
  "REACHABILITY",
] as const satisfies readonly SegmentAspect[];

export const OPTIONAL_GENERATED_SEGMENT_ASPECTS = [
  "WHO_BOUNDARY_ROLE",
] as const satisfies readonly SegmentAspect[];

export const WHO_SEGMENT_ASPECTS = [
  "WHO_CORE",
  "WHO_DISTINGUISHERS",
  "WHO_BOUNDARY_ROLE",
] as const satisfies readonly SegmentAspect[];

export const SEGMENT_ASPECT_LABELS: Record<SegmentAspect, string> = {
  WHO_CORE: "Wer: Segmentkern",
  WHO_DISTINGUISHERS: "Wer: Abgrenzende Merkmale",
  WHO_BOUNDARY_ROLE: "Wer: Abgrenzung/Rolle",
  PROBLEM_NEED: "Problem & Bedarf",
  BEHAVIOR_CONTEXT: "Verhalten & Kontext",
  WILLINGNESS_TO_PAY: "Zahlungsbereitschaft",
  REACHABILITY: "Erreichbarkeit",
};

export function isSegmentAspect(value: string): value is SegmentAspect {
  return (SEGMENT_ASPECTS as readonly string[]).includes(value);
}
