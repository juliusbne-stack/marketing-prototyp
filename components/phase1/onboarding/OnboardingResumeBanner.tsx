"use client";

export function OnboardingResumeBanner({
  questionNumber,
  onDismiss,
}: {
  questionNumber: number;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/20 bg-accent-soft px-4 py-3">
      <p className="text-sm text-text">
        Du warst bei Frage {questionNumber} —{" "}
        <span className="font-medium">weitermachen?</span>
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
      >
        Weiter
      </button>
    </div>
  );
}
