// Formats metric success thresholds for the cockpit goal line — display only.
export function formatImplementationGoals(
  metrics: { successCriterion: string }[],
  timeframe: string | null
): string | null {
  if (metrics.length === 0) return null;

  const joined = metrics.map((metric) => metric.successCriterion).join(" · ");
  return timeframe ? `${joined} in ${timeframe}` : joined;
}
