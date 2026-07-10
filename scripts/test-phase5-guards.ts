/**
 * Phase 5 proxy-dampening guard tests. Run: npx tsx scripts/test-phase5-guards.ts
 */
import {
  dampenProxyResults,
  PROXY_DAMPEN_NOTE,
  type StepForProxyGuard,
} from "../lib/phase5/guards";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
}

const proxyOnlyStep: StepForProxyGuard = {
  id: "step-proxy",
  assumption: { id: "stmt-ziel" },
  metrics: [
    { metricRole: "DECISIVE", proxyStrength: "PROXY" },
    { metricRole: "SUPPORTING", proxyStrength: null },
  ],
};

const directStep: StepForProxyGuard = {
  id: "step-direct",
  assumption: { id: "stmt-pay" },
  metrics: [{ metricRole: "DECISIVE", proxyStrength: "DIRECT" }],
};

const mixedStep: StepForProxyGuard = {
  id: "step-mixed",
  assumption: { id: "stmt-mix" },
  metrics: [
    { metricRole: "DECISIVE", proxyStrength: "PROXY" },
    { metricRole: "DECISIVE", proxyStrength: "DIRECT" },
  ],
};

const feedbacks = [
  { id: "fb-a", stepId: "step-proxy", statementId: "stmt-ziel" },
  { id: "fb-b", stepId: "step-direct", statementId: "stmt-pay" },
  { id: "fb-c", stepId: "step-mixed", statementId: "stmt-mix" },
  { id: "fb-d", stepId: "step-proxy", statementId: "stmt-ziel" },
];

const baseAssessment = {
  statementId: "stmt-ziel",
  interpretation: "Die Schwelle wurde klar übertroffen.",
};

// (a) PROXY-only + SUPPORTED + FACT → dampened
const outA = dampenProxyResults(
  [
    {
      ...baseAssessment,
      feedbackId: "fb-a",
      result: "SUPPORTED",
      proposedNewStatus: "FACT",
    },
  ],
  [proxyOnlyStep],
  feedbacks
)[0]!;

assert(outA.result === "PARTIALLY_SUPPORTED", "(a) result → PARTIALLY_SUPPORTED");
assert(
  outA.proposedNewStatus === "ASSUMPTION",
  "(a) proposedNewStatus → ASSUMPTION"
);
assert(
  outA.interpretation.includes(PROXY_DAMPEN_NOTE),
  "(a) Proxy-Hinweis angehängt"
);
assert(outA.proxyDamped === true, "(a) proxyDamped gesetzt");

// (b) DIRECT + SUPPORTED + FACT → unverändert
const outB = dampenProxyResults(
  [
    {
      feedbackId: "fb-b",
      statementId: "stmt-pay",
      result: "SUPPORTED",
      interpretation: "Zahlung bestätigt.",
      proposedNewStatus: "FACT",
    },
  ],
  [directStep],
  feedbacks
)[0]!;

assert(outB.result === "SUPPORTED", "(b) DIRECT — result unverändert");
assert(outB.proposedNewStatus === "FACT", "(b) DIRECT — proposedNewStatus unverändert");
assert(!outB.proxyDamped, "(b) DIRECT — kein proxyDamped");

// (c) gemischt PROXY+DIRECT + SUPPORTED → unverändert
const outC = dampenProxyResults(
  [
    {
      feedbackId: "fb-c",
      statementId: "stmt-mix",
      result: "SUPPORTED",
      interpretation: "Gemischte Metriken stützen.",
      proposedNewStatus: "FACT",
    },
  ],
  [mixedStep],
  feedbacks
)[0]!;

assert(outC.result === "SUPPORTED", "(c) gemischt — result unverändert");
assert(!outC.proxyDamped, "(c) gemischt — kein proxyDamped");

// (d) bereits PARTIALLY_SUPPORTED bei PROXY → unverändert
const outD = dampenProxyResults(
  [
    {
      ...baseAssessment,
      feedbackId: "fb-d",
      result: "PARTIALLY_SUPPORTED",
      proposedNewStatus: "ASSUMPTION",
    },
  ],
  [proxyOnlyStep],
  feedbacks
)[0]!;

assert(
  outD.result === "PARTIALLY_SUPPORTED",
  "(d) bereits PARTIALLY_SUPPORTED — unverändert"
);
assert(
  outD.proposedNewStatus === "ASSUMPTION",
  "(d) proposedNewStatus unverändert"
);
assert(
  !outD.interpretation.includes(PROXY_DAMPEN_NOTE),
  "(d) kein doppelter Proxy-Hinweis"
);
assert(!outD.proxyDamped, "(d) kein proxyDamped");

console.log("\nAlle Phase-5-Guard-Tests bestanden.");
