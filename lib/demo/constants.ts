/** Deterministic identifiers for the Nouriva Meals demo project. */
export const DEMO_PROJECT_NAME =
  "Nouriva Meals – Vegane High-Protein-Fertigmahlzeiten";

/** Stable slug used to find or reset the demo project (name substring match). */
export const DEMO_PROJECT_SLUG = "nouriva-meals";

/** Fixed base timestamp for deterministic createdAt/updatedAt in demo seeds. */
export const DEMO_BASE_TIME = new Date("2026-03-15T10:00:00.000Z");

/**
 * full = Phasen 1–5 inkl. Cockpit-Rückmeldungen;
 * phase4 = Screenshot-Zustand Phase 4;
 * phase5 = Einstieg Phase 5 ohne Rückmeldungen;
 * start = Profil + Phase-Inputs, currentPhase=1, keine Analyseartefakte (Live-Demo mit Fake-KI).
 */
export type DemoSeedVariant = "full" | "phase4" | "phase5" | "start";

export const DEMO_PHASE4_SCREENSHOT_CURRENT_PHASE = 4;

/** Model label stored on demo task elaborations (no real OpenAI call). */
export const DEMO_FAKE_AI_MODEL = "demo-fixture";
