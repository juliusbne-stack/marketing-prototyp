/**
 * Lightweight guard tests (no DB). Run: npx tsx scripts/test-phase4-guards.ts
 */
import {
  ALLOWED_DECISIVE_SIGNAL,
  computeWhitelistSingleDimension,
  validateSteps,
  type GuardContext,
  type WhitelistCandidate,
} from "../lib/phase4/guards";
import type { Phase4LlmResponse } from "../lib/schemas/phase4";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

const baseStep = {
  validationQuestion: "Q?",
  testDesign: "T",
  title: "Schritt",
  description: "D",
  marketingActivities: ["A", "B"],
  channel: "Instagram",
  timeframe: "3 Wochen",
  budgetFrame: "100 €",
};

const validationCtx: GuardContext = {
  mode: "VALIDATION",
  whitelist: [
    {
      id: "s1",
      content: "A1",
      evidenceStatus: "ASSUMPTION",
      strategyDimension: "MARKET_ACCESS",
      category: "OPT_MARKET_ACCESS",
    },
    {
      id: "s2",
      content: "A2",
      evidenceStatus: "OPEN_QUESTION",
      strategyDimension: "CUSTOMER_PROBLEM",
      category: "OPT_CUSTOMER_PROBLEM",
    },
  ],
  validatedChannels: [],
  whitelistSingleDimension: false,
};

// T4: WTP → only COMMITMENT decisive
const wtpResult: Phase4LlmResponse = {
  criticalAssumptions: ["s1"],
  steps: [
    {
      ...baseStep,
      assumptionId: "s1",
      strategyDimension: "MARKET_ACCESS",
      testSubject: "WILLINGNESS_TO_PAY",
      metrics: [
        {
          name: "Vorbestellungen",
          evaluationMode: "CUMULATIVE",
          metricRole: "DECISIVE",
          signalCategory: "COMMITMENT",
          successCriterion: "Skalierung trägt wenn 10+",
          failureCriterion: "Grenze wenn <3",
        },
        {
          name: "Reichweite",
          evaluationMode: "PER_POINT",
          metricRole: "SUPPORTING",
          signalCategory: "ATTENTION",
          successCriterion: "stützend wenn hoch",
          failureCriterion: "widerlegend wenn niedrig",
        },
      ],
    },
    {
      ...baseStep,
      assumptionId: "s2",
      strategyDimension: "CUSTOMER_PROBLEM",
      testSubject: "PROBLEM_RELEVANCE",
      metrics: [
        {
          name: "Interview-Bestätigung",
          evaluationMode: "PER_POINT",
          metricRole: "DECISIVE",
          signalCategory: "QUALITATIVE",
          successCriterion: "stützend wenn 70%",
          failureCriterion: "widerlegend wenn 30%",
        },
      ],
    },
  ],
};

assert(
  validateSteps(wtpResult, validationCtx).length === 0,
  "T4 — WTP mit COMMITMENT decisive ist gültig"
);

// T5: V5 — ATTENTION decisive
const v5Result: Phase4LlmResponse = {
  ...wtpResult,
  steps: [
    {
      ...wtpResult.steps[0]!,
      metrics: [
        {
          name: "Engagement-Rate",
          evaluationMode: "PER_POINT",
          metricRole: "DECISIVE",
          signalCategory: "ATTENTION",
          successCriterion: "x",
          failureCriterion: "y",
        },
      ],
    },
    wtpResult.steps[1]!,
  ],
};
const v5Violations = validateSteps(v5Result, validationCtx);
assert(
  v5Violations.some((violation) => violation.rule === "V5"),
  "T5 — ATTENTION als DECISIVE löst V5 aus"
);

// T3 — single dimension whitelist skips V3
const singleDimCtx: GuardContext = {
  ...validationCtx,
  whitelist: [validationCtx.whitelist[0]!],
  whitelistSingleDimension: computeWhitelistSingleDimension([
    validationCtx.whitelist[0]!,
  ]),
};
const singleDimResult: Phase4LlmResponse = {
  criticalAssumptions: ["s1", "s2"],
  steps: [
    { ...wtpResult.steps[0]!, assumptionId: "s1" },
    {
      ...wtpResult.steps[0]!,
      assumptionId: "s2",
      strategyDimension: "MARKET_ACCESS",
    },
  ],
};
// s2 not in single whitelist - use only s1 duplicated would be V2. Test V3 skip:
const multiStepSameDim: Phase4LlmResponse = {
  criticalAssumptions: ["s1"],
  steps: [wtpResult.steps[0]!],
};
assert(
  !validateSteps(multiStepSameDim, singleDimCtx).some(
    (violation) => violation.rule === "V3"
  ),
  "T3 — V3 greift nicht bei eindimensionaler Whitelist"
);

// T9 / V6 scaling
const scalingCtx: GuardContext = {
  mode: "SCALING",
  whitelist: [
    {
      id: "f1",
      content: "Fakt",
      evidenceStatus: "FACT",
      strategyDimension: "MARKET_ACCESS",
      category: "OPT_MARKET_ACCESS",
    },
  ],
  validatedChannels: ["Instagram"],
  whitelistSingleDimension: true,
};
const v6Result: Phase4LlmResponse = {
  criticalAssumptions: ["f1"],
  steps: [
    {
      ...baseStep,
      assumptionId: "f1",
      channel: "TikTok",
      strategyDimension: "MARKET_ACCESS",
      testSubject: "WILLINGNESS_TO_PAY",
      metrics: wtpResult.steps[0]!.metrics,
    },
    {
      ...baseStep,
      assumptionId: "f1",
      channel: "Instagram",
      strategyDimension: "MARKET_ACCESS",
      testSubject: "REACHABILITY",
      metrics: [
        {
          name: "CTR",
          evaluationMode: "PER_POINT",
          metricRole: "DECISIVE",
          signalCategory: "BEHAVIOR",
          successCriterion: "x",
          failureCriterion: "y",
        },
      ],
    },
  ],
};
const v6Violations = validateSteps(v6Result, scalingCtx);
assert(
  v6Violations.some((violation) => violation.rule === "V6"),
  "T8 — nicht validierter Kanal TikTok löst V6 aus"
);
assert(
  !validateSteps(
    { ...v6Result, steps: [v6Result.steps[1]!] },
    scalingCtx
  ).some((violation) => violation.rule === "V3"),
  "T9 — V3 (Diversität) wird im SCALING-Modus nicht geprüft"
);

console.log("\nAlle Guard-Unit-Tests bestanden.");
console.log("ALLOWED_DECISIVE_SIGNAL keys:", Object.keys(ALLOWED_DECISIVE_SIGNAL).length);
