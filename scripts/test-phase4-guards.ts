/**
 * Lightweight guard tests (no DB). Run: npx tsx scripts/test-phase4-guards.ts
 *
 * V7 / V7s suite (Stufe 2b, ZIEL = Nutzungs-uncertainty, allowed VALUE_UNDERSTANDING + OTHER):
 *   (a)  REACHABILITY + DECISIVE Klickrate → V7 (structural, reach-proxy veto)
 *   (b)  Explicit reach uncertainty + REACHABILITY + CTR → no V7 (REACHABILITY allowed)
 *   (c)  VALUE_UNDERSTANDING + DECISIVE BEHAVIOR → pass
 *   (d)  REACHABILITY label + DECISIVE non-reach BEHAVIOR, SUPPORTING Klickrate → V7s only
 *   (e1) RELABEL: REACHABILITY label + genuine usage BEHAVIOR (no proxy vocab) → V7s, not V7
 *   (e2) COUNTER: REACHABILITY + DECISIVE Klickrate/CTR → V7 must stay structural
 */
import {
  ALLOWED_DECISIVE_SIGNAL,
  computeWhitelistDimensionState,
  validateSteps,
  type GuardContext,
  type WhitelistCandidate,
} from "../lib/phase4/guards";
import {
  deriveAllowedDecisiveTestSubjects,
  serializeAllowedTestSubjects,
} from "../lib/phase4/testSubjectDerivation";
import type { Phase4LlmResponse } from "../lib/schemas/phase4";

function withAllowed(
  candidate: Omit<WhitelistCandidate, "allowedDecisiveTestSubjects">
): WhitelistCandidate {
  return {
    ...candidate,
    allowedDecisiveTestSubjects: serializeAllowedTestSubjects(
      deriveAllowedDecisiveTestSubjects({
        content: candidate.content,
        justification: candidate.justification,
        uncertainty: candidate.uncertainty,
      })
    ),
  };
}

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
    withAllowed({
      id: "s1",
      content: "Die Zielgruppe ist bereit, 50 € für das Angebot zu zahlen.",
      justification: null,
      uncertainty: null,
      evidenceStatus: "ASSUMPTION",
      strategyDimension: "MARKET_ACCESS",
      category: "OPT_MARKET_ACCESS",
    }),
    withAllowed({
      id: "s2",
      content: "Das Kundenproblem ist spürbar und relevant.",
      justification: null,
      uncertainty: null,
      evidenceStatus: "OPEN_QUESTION",
      strategyDimension: "CUSTOMER_PROBLEM",
      category: "OPT_CUSTOMER_PROBLEM",
    }),
  ],
  validatedChannels: [],
  whitelistDimensionState: "MULTI",
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
  whitelistDimensionState: computeWhitelistDimensionState([
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
    withAllowed({
      id: "f1",
      content: "Die Zielgruppe ist über Instagram erreichbar und zahlt 30 €.",
      justification: null,
      uncertainty: null,
      evidenceStatus: "FACT",
      strategyDimension: "MARKET_ACCESS",
      category: "OPT_MARKET_ACCESS",
    }),
  ],
  validatedChannels: ["Instagram"],
  whitelistDimensionState: "SINGLE",
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

// --- V7 / V7s (Stufe 2b) ---
const zielCandidate = withAllowed({
  id: "ziel",
  content:
    "Diese Option adressiert das Segment mit Fokus auf deren Interesse an kostengünstigen, digitalen Strategietools.",
  justification:
    "Frühphasige Start-ups haben ein Interesse an kostengünstigen Lösungen zur Marketingstrategieentwicklung.",
  uncertainty:
    "Die Bereitwilligkeit zur Nutzung digitaler Plattformen muss noch valide geprüft werden.",
  evidenceStatus: "ASSUMPTION",
  strategyDimension: "TARGET_GROUP",
  category: "OPT_TARGET_GROUP",
});

const zielCtx: GuardContext = {
  mode: "VALIDATION",
  whitelist: [zielCandidate],
  validatedChannels: [],
  whitelistDimensionState: "SINGLE",
};

const zielReachStep: Phase4LlmResponse = {
  criticalAssumptions: ["ziel"],
  steps: [
    {
      ...baseStep,
      assumptionId: "ziel",
      strategyDimension: "TARGET_GROUP",
      testSubject: "REACHABILITY",
      metrics: [
        {
          name: "Anzeigen-Klickrate",
          evaluationMode: "PER_POINT",
          metricRole: "DECISIVE",
          signalCategory: "BEHAVIOR",
          successCriterion: "stützend wenn über 1 %",
          failureCriterion: "widerlegend wenn unter 1 %",
        },
      ],
    },
  ],
};

assert(
  validateSteps(zielReachStep, zielCtx).some((violation) => violation.rule === "V7"),
  "(a) ZIEL — REACHABILITY+DECISIVE Klickrate löst V7 (structural) aus"
);

const reachCandidate = withAllowed({
  id: "reach",
  content: "Frühphasige Start-ups sind über LinkedIn ansprechbar.",
  justification: "Der Kanal wird in der Zielgruppe genutzt.",
  uncertainty:
    "Es ist unklar, ob die Zielgruppe über LinkedIn mit ausreichender Reichweite erreichbar ist.",
  evidenceStatus: "ASSUMPTION",
  strategyDimension: "MARKET_ACCESS",
  category: "OPT_MARKET_ACCESS",
});

const reachCtx: GuardContext = {
  mode: "VALIDATION",
  whitelist: [reachCandidate],
  validatedChannels: [],
  whitelistDimensionState: "SINGLE",
};

const reachValidStep: Phase4LlmResponse = {
  criticalAssumptions: ["reach"],
  steps: [
    {
      ...baseStep,
      assumptionId: "reach",
      strategyDimension: "MARKET_ACCESS",
      testSubject: "REACHABILITY",
      metrics: [
        {
          name: "CTR",
          evaluationMode: "PER_POINT",
          metricRole: "DECISIVE",
          signalCategory: "BEHAVIOR",
          successCriterion: "stützend wenn über 2 %",
          failureCriterion: "widerlegend wenn unter 0,5 %",
        },
      ],
    },
  ],
};

assert(
  !validateSteps(reachValidStep, reachCtx).some((violation) => violation.rule === "V7"),
  "(b) Reichweiten-Fall — REACHABILITY+DECISIVE CTR ohne V7"
);

const zielValueStep: Phase4LlmResponse = {
  criticalAssumptions: ["ziel"],
  steps: [
    {
      ...baseStep,
      assumptionId: "ziel",
      strategyDimension: "TARGET_GROUP",
      testSubject: "VALUE_UNDERSTANDING",
      metrics: [
        {
          name: "Demo-Anmeldungen",
          evaluationMode: "CUMULATIVE",
          metricRole: "DECISIVE",
          signalCategory: "BEHAVIOR",
          successCriterion: "stützend wenn mindestens 15 Anmeldungen",
          failureCriterion: "widerlegend wenn unter 5 Anmeldungen",
        },
      ],
    },
  ],
};

assert(
  validateSteps(zielValueStep, zielCtx).length === 0,
  "(c) ZIEL — VALUE_UNDERSTANDING+DECISIVE BEHAVIOR ohne Verstoß"
);

const zielSupportingReachStep: Phase4LlmResponse = {
  criticalAssumptions: ["ziel"],
  steps: [
    {
      ...baseStep,
      assumptionId: "ziel",
      strategyDimension: "TARGET_GROUP",
      testSubject: "REACHABILITY",
      metrics: [
        {
          name: "Demo-Anmeldungen",
          evaluationMode: "CUMULATIVE",
          metricRole: "DECISIVE",
          signalCategory: "BEHAVIOR",
          successCriterion: "stützend wenn mindestens 10 Anmeldungen",
          failureCriterion: "widerlegend wenn unter 3 Anmeldungen",
        },
        {
          name: "Klickrate",
          evaluationMode: "PER_POINT",
          metricRole: "SUPPORTING",
          signalCategory: "BEHAVIOR",
          successCriterion: "stützend wenn über 1 %",
          failureCriterion: "widerlegend wenn unter 0,5 %",
        },
      ],
    },
  ],
};

const zielSupportingViolations = validateSteps(zielSupportingReachStep, zielCtx);
assert(
  zielSupportingViolations.some((violation) => violation.rule === "V7s") &&
    !zielSupportingViolations.some((violation) => violation.rule === "V7"),
  "(d) ZIEL — REACHABILITY nur SUPPORTING → V7s, nicht V7"
);

const zielRelabelStep: Phase4LlmResponse = {
  criticalAssumptions: ["ziel"],
  steps: [
    {
      ...baseStep,
      assumptionId: "ziel",
      strategyDimension: "TARGET_GROUP",
      testSubject: "REACHABILITY",
      metrics: [
        {
          name: "Aktivierungsrate im Tool",
          evaluationMode: "PER_POINT",
          metricRole: "DECISIVE",
          signalCategory: "BEHAVIOR",
          successCriterion:
            "stützend wenn mindestens 30 % der Anmeldungen das Tool aktiv nutzen",
          failureCriterion: "widerlegend wenn unter 10 % aktiv nutzen",
        },
      ],
    },
  ],
};

const zielRelabelViolations = validateSteps(zielRelabelStep, zielCtx);
assert(
  zielRelabelViolations.some((violation) => violation.rule === "V7s") &&
    !zielRelabelViolations.some((violation) => violation.rule === "V7"),
  "(e1) RELABEL — REACHABILITY-Label + genuines Nutzungs-BEHAVIOR → V7s, nicht V7"
);

const zielReachProxyStep: Phase4LlmResponse = {
  criticalAssumptions: ["ziel"],
  steps: [
    {
      ...baseStep,
      assumptionId: "ziel",
      strategyDimension: "TARGET_GROUP",
      testSubject: "REACHABILITY",
      metrics: [
        {
          name: "Klickrate",
          evaluationMode: "PER_POINT",
          metricRole: "DECISIVE",
          signalCategory: "BEHAVIOR",
          successCriterion: "stützend wenn über 1 % CTR",
          failureCriterion: "widerlegend wenn unter 0,5 %",
        },
      ],
    },
  ],
};

assert(
  validateSteps(zielReachProxyStep, zielCtx).some(
    (violation) => violation.rule === "V7"
  ),
  "(e2) GEGENPROBE — REACHABILITY + DECISIVE Klickrate/CTR → V7 (structural)"
);

console.log(
  "ZIEL allowedDecisiveTestSubjects:",
  zielCandidate.allowedDecisiveTestSubjects.join(", ")
);

console.log("\nAlle Guard-Unit-Tests bestanden.");
console.log("ALLOWED_DECISIVE_SIGNAL keys:", Object.keys(ALLOWED_DECISIVE_SIGNAL).length);
