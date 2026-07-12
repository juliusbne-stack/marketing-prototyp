import type {
  AssumptionInput,
  Phase4ConsistencyIssue,
  ValidationClaimType,
  ValidationCore,
} from "./validationCoreTypes";

const NEED_SIGNAL =
  /\b(bedarf|bedürfnis|sucht nach|benötigt|braucht|interesse an|nachfrage nach|wollen.*(lösung|methode|unterstützung))\b/i;
const PROBLEM_SIGNAL =
  /\b(problem|schmerz|problemrelevanz|unzureichend gelöst|schwierigkeit|mühe|herausforderung|unstrukturiert)\b/i;
const PAYMENT_SIGNAL =
  /\b(zahlungsbereitschaft|zahlungsbereit|zahlen|abo|abonnement|preis|€|euro|monatlich)\b/i;
const REACH_SIGNAL =
  /\b(erreichbar|erreichen|reichweite|kanal|marktzugang|zugang\s+zur\s+zielgruppe|linkedin.*gruppe|über\s+[\wäöüß.-]+\s+(ansprechen|finden|erreichen))\b/i;
const CHANNEL_FIT_SIGNAL =
  /\b(kanal.*pass|plattform.*nutzen|über\s+(linkedin|instagram|facebook|tiktok)|social.?media.?kanal)\b/i;
const VALUE_SIGNAL =
  /\b(nutzen|hilfreich|wahrgenommen|verständnis|nutzenversprechen|wert|präferenz|gegenüber|besser als|vergleich)\b/i;
const ADOPTION_SIGNAL =
  /\b(nutzung|nutzen|registrierung|aktivierung|testbeginn|adoption|einlassen|akzeptanz)\b/i;
const DIFFERENTIATION_SIGNAL =
  /\b(abgrenzung|alternative|differenzierung|einzigartig|unterscheidet)\b/i;
const REVENUE_SIGNAL =
  /\b(erlös|umsatz|monetarisierung|pricing|abonnementmodell)\b/i;
const SEGMENT_FIT_SIGNAL =
  /\b(passt zur|segment.*relevant|homogen|zielgruppe.*passt|adressiert das segment)\b/i;
const RETENTION_SIGNAL = /\b(bindung|retention|wiederverwendung|wiederkehrend)\b/i;
const TRUST_SIGNAL = /\b(vertrauen|glaubwürdigkeit|seriosität)\b/i;

const COMPOUND_NEED_AND_REACH =
  /\b(bedarf|bedürfnis|problem).{0,60}\bund\b.{0,60}\b(erreichbar|reichweite|linkedin|kanal)\b/i;
const COMPOUND_REACH_AND_NEED =
  /\b(erreichbar|reichweite|linkedin|kanal).{0,60}\bund\b.{0,60}\b(bedarf|bedürfnis|problem)\b/i;

function combinedText(input: AssumptionInput): string {
  return [input.uncertainty, input.justification, input.content]
    .filter(Boolean)
    .join(" ");
}

function extractTargetGroup(content: string, fullText: string): string {
  for (const source of [content, fullText]) {
    const focalSegment = source.match(
      /Segment\s+(.{8,100}?)\s+mit\s+dem\s+Fokus/i
    );
    if (focalSegment?.[1]) {
      return focalSegment[1]
        .replace(/^[\s\u201A\u201E\u201C\u201D‚„"'']+|[\s\u201A\u201E\u201C\u201D‚„"'']+$/g, "")
        .trim();
    }

    const segmentLabel = source.match(
      /Segment\s+[\u201A\u201E‚„"'']([^\u201A\u201E‚„"'']{3,80})[\u201A\u201E‚„"'']/i
    );
    if (segmentLabel?.[1]) return segmentLabel[1].trim();

    const segmentMatch = source.match(
      /Segment\s+[‚„"']([^‚„"']{3,80})[‚„"']/i
    );
    if (segmentMatch?.[1]) return segmentMatch[1].trim();

    const quoteMatch = source.match(/[„‚"']([^„‚"']{3,80})[„‚"']/);
    if (
      quoteMatch?.[1] &&
      /segment|gründer|founder|start-up|solo/i.test(source)
    ) {
      return quoteMatch[1].trim();
    }
  }
  return "die definierte Zielgruppe";
}

function scoreClaimTypes(text: string): Map<ValidationClaimType, number> {
  const scores = new Map<ValidationClaimType, number>();
  const add = (type: ValidationClaimType, weight: number) => {
    scores.set(type, (scores.get(type) ?? 0) + weight);
  };

  if (PAYMENT_SIGNAL.test(text)) add("WILLINGNESS_TO_PAY", 3);
  if (REACH_SIGNAL.test(text)) add("REACHABILITY", 3);
  if (CHANNEL_FIT_SIGNAL.test(text)) add("CHANNEL_FIT", 2);
  if (NEED_SIGNAL.test(text)) add("NEED", 3);
  if (PROBLEM_SIGNAL.test(text)) add("PROBLEM_RELEVANCE", 3);
  if (VALUE_SIGNAL.test(text)) add("VALUE_PERCEPTION", 3);
  if (ADOPTION_SIGNAL.test(text)) add("ADOPTION_INTENT", 2);
  if (DIFFERENTIATION_SIGNAL.test(text)) add("VALUE_PERCEPTION", 2);
  if (REVENUE_SIGNAL.test(text)) add("WILLINGNESS_TO_PAY", 1);
  if (SEGMENT_FIT_SIGNAL.test(text)) add("SEGMENT_FIT", 2);
  if (RETENTION_SIGNAL.test(text)) add("RETENTION", 2);
  if (TRUST_SIGNAL.test(text)) add("TRUST", 2);

  return scores;
}

function pickPrimaryClaimType(
  text: string,
  uncertainty: string
): { claimType: ValidationClaimType; confidence: ValidationCore["confidence"] } {
  const scores = scoreClaimTypes(text);

  // Uncertainty-first: if uncertainty names a specific topic, boost it.
  if (uncertainty) {
    const uScores = scoreClaimTypes(uncertainty);
    for (const [type, weight] of uScores) {
      scores.set(type, (scores.get(type) ?? 0) + weight * 2);
    }
  }

  // REACHABILITY-VETO: usage/interest uncertainty without reach verbs blocks reach.
  if (
    uncertainty &&
    ADOPTION_SIGNAL.test(uncertainty) &&
    !REACH_SIGNAL.test(uncertainty)
  ) {
    scores.delete("REACHABILITY");
    scores.delete("CHANNEL_FIT");
  }

  if (scores.size === 0) {
    return { claimType: "OTHER", confidence: "LOW" };
  }

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0]!;
  const second = sorted[1];

  let confidence: ValidationCore["confidence"] = "HIGH";
  if (!second || top[1] - second[1] < 2) confidence = "MEDIUM";
  if (top[1] <= 2) confidence = "LOW";

  return { claimType: top[0], confidence };
}

function buildClaimTexts(
  claimType: ValidationClaimType,
  targetGroup: string,
  text: string
): Pick<
  ValidationCore,
  "claim" | "claimedOutcome" | "strategicConsequence" | "falsificationCondition"
> {
  switch (claimType) {
    case "WILLINGNESS_TO_PAY":
      return {
        claim: `${targetGroup} ist bereit, für das Angebot zu zahlen.`,
        claimedOutcome:
          "Qualifizierte Personen treffen eine verbindliche Preis- oder Kaufentscheidung.",
        strategicConsequence: "Das Preismodell ist grundsätzlich tragfähig.",
        falsificationCondition:
          "Trotz sichtbarem Preisangebot zeigen qualifizierte Personen keine Kauf-, Vorbestell- oder Zahlungszusage.",
      };
    case "REACHABILITY":
    case "CHANNEL_FIT":
      return {
        claim: `${targetGroup} ist über den genannten Kanal effizient erreichbar.`,
        claimedOutcome:
          "Qualifizierte Personen reagieren mit messbarer Antwort- oder Kontaktquote.",
        strategicConsequence: "Der Kanal eignet sich als Zugangsweg.",
        falsificationCondition:
          "Der Kanal erzeugt keine qualifizierte Reichweite oder Antwortquote.",
      };
    case "NEED":
      return {
        claim: `${targetGroup} hat einen erkennbaren Bedarf an der beschriebenen Lösung.`,
        claimedOutcome:
          "Qualifizierte Personen bestätigen Problemdruck und zeigen konkretes Interesse an Unterstützung.",
        strategicConsequence: "Der Bedarf rechtfertigt einen Validierungstest.",
        falsificationCondition:
          "Die Zielgruppe zeigt keinen erkennbaren Bedarf oder fordert keine weiteren Informationen an.",
      };
    case "PROBLEM_RELEVANCE":
      return {
        claim: `${targetGroup} erlebt das beschriebene Problem als relevant und bislang unzureichend gelöst.`,
        claimedOutcome:
          "Qualifizierte Personen bestätigen konkreten Problemdruck und zeigen Interesse an systematischer Unterstützung.",
        strategicConsequence:
          "Das Segment ist grundsätzlich relevant für die Lösung.",
        falsificationCondition:
          "Die Zielgruppe erkennt keinen relevanten Problemdruck oder zeigt trotz verständlichem Angebot kein konkretes Interesse.",
      };
    case "VALUE_PERCEPTION":
      return {
        claim: `Das Nutzenversprechen wird von ${targetGroup} als hilfreich oder überlegen wahrgenommen.`,
        claimedOutcome:
          "Qualifizierte Personen bevorzugen das Angebot, bestätigen den Nutzen oder nutzen es aktiv.",
        strategicConsequence: "Die Wertkommunikation trifft den Kernbedarf.",
        falsificationCondition:
          "Die Zielgruppe sieht keinen klaren Mehrwert oder bevorzugt Alternativen.",
      };
    case "ADOPTION_INTENT":
    case "USAGE_BEHAVIOR":
      return {
        claim: `${targetGroup} zeigt Bereitschaft zur Nutzung des Angebots.`,
        claimedOutcome:
          "Qualifizierte Personen registrieren sich, beginnen einen Test oder nutzen das Angebot aktiv.",
        strategicConsequence: "Die Nutzungsbereitschaft ist grundsätzlich gegeben.",
        falsificationCondition:
          "Trotz Zugang zum Angebot beginnen qualifizierte Personen keine relevante Nutzung.",
      };
    default:
      return {
        claim: text.slice(0, 200) || `Die Annahme zu ${targetGroup} trifft zu.`,
        claimedOutcome:
          "Eine qualifizierte Beobachtung stützt oder widerlegt die Annahme.",
        strategicConsequence: "Die Annahme ist strategisch relevant.",
        falsificationCondition:
          "Die Beobachtung widerspricht der Annahme oder bleibt uneindeutig.",
      };
  }
}

/** Detects independent claims that must not be tested in a single step. */
export function detectCompoundClaims(
  input: AssumptionInput
): Phase4ConsistencyIssue | null {
  const text = combinedText(input);
  if (
    COMPOUND_NEED_AND_REACH.test(text) ||
    COMPOUND_REACH_AND_NEED.test(text)
  ) {
    return {
      code: "PHASE4_MULTIPLE_CLAIMS_IN_SINGLE_STEP",
      severity: "ERROR",
      message:
        "Die Annahme enthält mehrere unabhängige Behauptungen (z. B. Bedarf und Erreichbarkeit), die nicht in einem unscharfen Test vermischt werden dürfen.",
      repairInstruction:
        "Trenne Bedarf/Problemrelevanz von Erreichbarkeit. Erzeuge pro Schritt nur einen primären Erkenntnisgegenstand.",
    };
  }
  return null;
}

export function checkTestability(
  input: AssumptionInput
): Phase4ConsistencyIssue | null {
  const text = combinedText(input);
  if (!text.trim() || text.trim().length < 20) {
    return {
      code: "PHASE4_CLAIM_CORE_MISMATCH",
      severity: "ERROR",
      message: "Die Annahme enthält keine ausreichend konkrete Behauptung.",
    };
  }
  return null;
}

/** Derives internal ValidationCore from assumption fields. strategyDimension is classification only. */
export function deriveValidationCore(input: AssumptionInput): ValidationCore {
  const text = combinedText(input);
  const content = input.content.trim();
  const uncertainty = input.uncertainty?.trim() ?? "";
  const targetGroup = extractTargetGroup(content, text);
  const { claimType, confidence } = pickPrimaryClaimType(text, uncertainty);
  const claimTexts = buildClaimTexts(claimType, targetGroup, text);

  return {
    claimType,
    targetGroup,
    ...claimTexts,
    sourceDimension: input.strategyDimension ?? input.category,
    confidence,
  };
}
