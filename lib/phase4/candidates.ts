import type {
  EvidenceStrength,
  NormalizedPhase4Constraints,
  ValidationCore,
  ValidationMethodCandidate,
} from "./validationCoreTypes";
import { isSocialMediaAllowed, hasOwnedSocialReach } from "./constraints";

function candidate(
  partial: ValidationMethodCandidate
): ValidationMethodCandidate {
  return partial;
}

function baseCandidatesForNeedOrProblem(
  core: ValidationCore,
  constraints: NormalizedPhase4Constraints
): ValidationMethodCandidate[] {
  const socialAllowed = isSocialMediaAllowed(constraints);
  const ownedReach = hasOwnedSocialReach(constraints);
  const interviewsExcluded = constraints.interviews === "EXCLUDED";
  const surveyOk =
    constraints.surveys !== "EXCLUDED" &&
    constraints.surveys !== "UNKNOWN";

  const list: ValidationMethodCandidate[] = [];

  if (socialAllowed) {
    list.push(
      candidate({
        title: "Organischer Social-Media-Beitrag auf eigenem Profil",
        methodType: "social_owned",
        description:
          "Kurzer Beitrag mit Problemhypothese auf dem eigenen Social-Media-Profil.",
        evidenceProduced: ["Reichweite", "Engagement"],
        decisiveSignalType: "ATTENTION",
        supportingSignalTypes: ["BEHAVIOR"],
        targetGroupAccessPath: "bestehende Follower",
        requiredResources: ["Social-Media-Profil", "eigene Reichweite"],
        requiredMethods: ["social"],
        requiresOwnedReach: true,
        estimatedEffort: "LOW",
        estimatedEvidenceStrength: "WEAK",
        risks: [
          "Misst eher Reichweite als Bedarf",
          "Keine qualifizierte Problembestätigung",
        ],
      })
    );

    list.push(
      candidate({
        title: "Gezielter Bedarfstest in Gründer-Communities",
        methodType: "social_community",
        description:
          "Kurzer Problembeitrag mit Link zu einer kompakten Bedarfsabfrage in relevanten Communities und bei ausgewählten Zielgruppenpersonen.",
        evidenceProduced: [
          "qualifizierte Problembestätigung",
          "Interessenshandlung",
          "qualitative Rückmeldungen",
        ],
        decisiveSignalType: "QUALITATIVE",
        supportingSignalTypes: ["ATTENTION", "BEHAVIOR"],
        targetGroupAccessPath:
          "Gründer-Communities, LinkedIn-Gruppen, gezielte Direktansprache",
        requiredResources: ["Community-Zugang oder Direktansprache"],
        requiredMethods: ["social", "umfrage"],
        requiresOwnedReach: false,
        estimatedEffort: "MEDIUM",
        estimatedEvidenceStrength: "STRONG",
        risks: ["Manueller Verteilungsaufwand"],
      })
    );
  }

  if (surveyOk) {
    list.push(
      candidate({
        title: "Gezielte Direktansprache mit Bedarfsabfrage",
        methodType: "direct_survey",
        description:
          "Kompakte schriftliche Bedarfsabfrage an ausgewählte Personen der Zielgruppe per Direktnachricht oder E-Mail.",
        evidenceProduced: [
          "qualifizierte Problembestätigung",
          "Anfrage nach Testzugang",
        ],
        decisiveSignalType: "QUALITATIVE",
        supportingSignalTypes: ["BEHAVIOR"],
        targetGroupAccessPath: "Direktansprache, bestehende Kontakte, Communities",
        requiredResources: ["Zielgruppenprofile", "Kontaktmöglichkeit"],
        requiredMethods: ["umfrage"],
        requiresOwnedReach: false,
        estimatedEffort: "HIGH",
        estimatedEvidenceStrength: "STRONG",
        risks: ["Hoher manueller Aufwand", "Geringe Stichprobe"],
      })
    );
  }

  if (!interviewsExcluded) {
    list.push(
      candidate({
        title: "Kurze qualitative Interviews",
        methodType: "interviews",
        description: "Strukturierte Kurzinterviews zur Problembestätigung.",
        evidenceProduced: ["qualifizierte Problembestätigung"],
        decisiveSignalType: "QUALITATIVE",
        supportingSignalTypes: [],
        targetGroupAccessPath: "Direktkontakte oder Netzwerk",
        requiredResources: ["Interviewleitfaden", "Zeit"],
        requiredMethods: ["interviews"],
        requiresOwnedReach: false,
        estimatedEffort: "MEDIUM",
        estimatedEvidenceStrength: "STRONG",
        risks: ["Zeitintensiv"],
      })
    );
  }

  void ownedReach;
  void core;
  return list;
}

function baseCandidatesForReachability(
  constraints: NormalizedPhase4Constraints
): ValidationMethodCandidate[] {
  const socialAllowed = isSocialMediaAllowed(constraints);
  const list: ValidationMethodCandidate[] = [];

  if (socialAllowed) {
    list.push(
      candidate({
        title: "LinkedIn-Gruppen-Reichweitentest",
        methodType: "social_groups",
        description:
          "Gezielte Beiträge in relevanten LinkedIn-Gruppen mit klarer Handlungsaufforderung.",
        evidenceProduced: ["qualifizierte Reichweite", "Antwortquote"],
        decisiveSignalType: "BEHAVIOR",
        supportingSignalTypes: ["ATTENTION"],
        targetGroupAccessPath: "LinkedIn-Gruppen",
        requiredResources: ["Gruppenmitgliedschaft"],
        requiredMethods: ["social"],
        requiresOwnedReach: false,
        estimatedEffort: "MEDIUM",
        estimatedEvidenceStrength: "MEDIUM",
        risks: ["Gruppenregeln", "Geringe Antwortquote"],
      })
    );
  }

  if (constraints.paidAds !== "EXCLUDED") {
    list.push(
      candidate({
        title: "Bezahlte Test-Anzeigen",
        methodType: "paid_ads",
        description: "Kleine Testkampagne zur Messung qualifizierter Reichweite.",
        evidenceProduced: ["Kontaktquote", "Cost per qualified contact"],
        decisiveSignalType: "BEHAVIOR",
        supportingSignalTypes: ["ATTENTION"],
        targetGroupAccessPath: "Bezahlte Ausspielung",
        requiredResources: ["Werbebudget"],
        requiredMethods: ["anzeigen"],
        requiresOwnedReach: false,
        estimatedEffort: "MEDIUM",
        estimatedEvidenceStrength: "MEDIUM",
        risks: ["Budgetbedarf"],
      })
    );
  }

  return list;
}

function baseCandidatesForWtp(
  constraints: NormalizedPhase4Constraints
): ValidationMethodCandidate[] {
  const list: ValidationMethodCandidate[] = [];

  if (constraints.landingPage !== "EXCLUDED" && constraints.canBuildLandingPage) {
    list.push(
      candidate({
        title: "Preisseite mit Vorbestellung",
        methodType: "landingpage",
        description: "Landingpage mit sichtbarem Preis und Vorbestelloption.",
        evidenceProduced: ["Vorbestellung", "Kaufzusage"],
        decisiveSignalType: "COMMITMENT",
        supportingSignalTypes: ["BEHAVIOR"],
        targetGroupAccessPath: "Bestehende Kanäle oder bezahlte Ausspielung",
        requiredResources: ["Landingpage"],
        requiredMethods: ["landingpage"],
        requiresOwnedReach: false,
        estimatedEffort: "MEDIUM",
        estimatedEvidenceStrength: "STRONG",
        risks: ["Technischer Aufwand"],
      })
    );
  }

  if (constraints.mvp !== "EXCLUDED") {
    list.push(
      candidate({
        title: "Preisentscheidungs-Angebot",
        methodType: "mvp",
        description: "Kleines kostenpflichtiges Angebot oder Testabo.",
        evidenceProduced: ["tatsächliche Zahlung"],
        decisiveSignalType: "COMMITMENT",
        supportingSignalTypes: [],
        targetGroupAccessPath: "Direktansprache",
        requiredResources: ["Zahlungsmöglichkeit"],
        requiredMethods: ["mvp"],
        requiresOwnedReach: false,
        estimatedEffort: "HIGH",
        estimatedEvidenceStrength: "STRONG",
        risks: ["Hoher Umsetzungsaufwand"],
      })
    );
  }

  return list;
}

function baseCandidatesForValue(
  constraints: NormalizedPhase4Constraints
): ValidationMethodCandidate[] {
  return [
    candidate({
      title: "Vergleichstest oder Prototyp-Nutzung",
      methodType: "comparison",
      description:
        "Geführter Test mit Alternativen oder Prototyp-Nutzung zur Präferenzmessung.",
      evidenceProduced: ["Präferenz", "Nutzenbewertung", "Nutzungsverhalten"],
      decisiveSignalType: "BEHAVIOR",
      supportingSignalTypes: ["QUALITATIVE"],
      targetGroupAccessPath: "Direktansprache oder Community",
      requiredResources: ["Stimulus oder Prototyp"],
      requiredMethods: constraints.surveys !== "EXCLUDED" ? ["umfrage"] : [],
      requiresOwnedReach: false,
      estimatedEffort: "MEDIUM",
      estimatedEvidenceStrength: "STRONG",
      risks: ["Aufwand für Stimulus"],
    }),
  ];
}

export function generateTestCandidates(
  core: ValidationCore,
  constraints: NormalizedPhase4Constraints
): ValidationMethodCandidate[] {
  switch (core.claimType) {
    case "PROBLEM_RELEVANCE":
    case "NEED":
      return baseCandidatesForNeedOrProblem(core, constraints);
    case "REACHABILITY":
    case "CHANNEL_FIT":
      return baseCandidatesForReachability(constraints);
    case "WILLINGNESS_TO_PAY":
      return baseCandidatesForWtp(constraints);
    case "VALUE_PERCEPTION":
    case "ADOPTION_INTENT":
    case "USAGE_BEHAVIOR":
    case "SEGMENT_FIT":
      return baseCandidatesForValue(constraints);
    default:
      return baseCandidatesForNeedOrProblem(core, constraints);
  }
}

function strengthScore(strength: EvidenceStrength): number {
  return strength === "STRONG" ? 3 : strength === "MEDIUM" ? 2 : 1;
}

function effortScore(effort: "LOW" | "MEDIUM" | "HIGH"): number {
  return effort === "LOW" ? 3 : effort === "MEDIUM" ? 2 : 1;
}

export function filterCandidates(
  candidates: ValidationMethodCandidate[],
  core: ValidationCore,
  constraints: NormalizedPhase4Constraints
): ValidationMethodCandidate[] {
  return candidates.filter((c) => {
    if (
      c.requiresOwnedReach &&
      constraints.ownedSocialReach === "LIMITED"
    ) {
      return false;
    }

    for (const method of c.requiredMethods) {
      const key = method as keyof NormalizedPhase4Constraints;
      if (method === "social" && constraints.socialMediaPosting === "EXCLUDED")
        return false;
      if (method === "interviews" && constraints.interviews === "EXCLUDED")
        return false;
      if (method === "anzeigen" && constraints.paidAds === "EXCLUDED")
        return false;
      if (method === "landingpage" && constraints.landingPage === "EXCLUDED")
        return false;
      if (method === "mvp" && constraints.mvp === "EXCLUDED") return false;
      if (method === "vor_ort" && constraints.onSite === "EXCLUDED")
        return false;
      void key;
    }

    if (
      (core.claimType === "PROBLEM_RELEVANCE" || core.claimType === "NEED") &&
      c.decisiveSignalType === "ATTENTION"
    ) {
      return false;
    }

    if (
      core.claimType === "WILLINGNESS_TO_PAY" &&
      c.decisiveSignalType !== "COMMITMENT"
    ) {
      return false;
    }

    if (
      (core.claimType === "REACHABILITY" || core.claimType === "CHANNEL_FIT") &&
      !c.evidenceProduced.some((e) =>
        /reichweite|antwort|kontakt/i.test(e)
      )
    ) {
      return false;
    }

    if (constraints.budgetLimited && c.requiredMethods.includes("anzeigen")) {
      return false;
    }

    if (constraints.weeksLimited && c.estimatedEffort === "HIGH") {
      return false;
    }

    return true;
  });
}

export function scoreCandidate(
  c: ValidationMethodCandidate,
  core: ValidationCore
): number {
  let score = 0;
  score += strengthScore(c.estimatedEvidenceStrength) * 10;
  score += effortScore(c.estimatedEffort) * 3;

  if (
    (core.claimType === "PROBLEM_RELEVANCE" || core.claimType === "NEED") &&
    c.evidenceProduced.some((e) => /problembestätigung|interessenshandlung/i.test(e))
  ) {
    score += 15;
  }

  if (
    core.claimType === "WILLINGNESS_TO_PAY" &&
    c.decisiveSignalType === "COMMITMENT"
  ) {
    score += 15;
  }

  if (
    (core.claimType === "REACHABILITY" || core.claimType === "CHANNEL_FIT") &&
    c.decisiveSignalType === "BEHAVIOR"
  ) {
    score += 15;
  }

  if (!c.requiresOwnedReach) score += 5;

  return score;
}

export function selectBestCandidate(
  candidates: ValidationMethodCandidate[],
  core: ValidationCore,
  constraints: NormalizedPhase4Constraints
): ValidationMethodCandidate {
  const filtered = filterCandidates(candidates, core, constraints);
  if (filtered.length === 0) {
    const fallback = candidates[0];
    if (!fallback) {
      return candidate({
        title: "Kompakter Bedarfstest",
        methodType: "fallback_survey",
        description: "Kompakte Bedarfsabfrage über verfügbare Kanäle.",
        evidenceProduced: ["qualifizierte Problembestätigung"],
        decisiveSignalType: "QUALITATIVE",
        supportingSignalTypes: ["BEHAVIOR"],
        targetGroupAccessPath: "Direktansprache oder Community",
        requiredResources: [],
        requiredMethods: ["umfrage"],
        requiresOwnedReach: false,
        estimatedEffort: "MEDIUM",
        estimatedEvidenceStrength: "MEDIUM",
        risks: [],
      });
    }
    return fallback;
  }

  return filtered.reduce((best, current) =>
    scoreCandidate(current, core) > scoreCandidate(best, core) ? current : best
  );
}

export function buildTopCandidates(
  core: ValidationCore,
  constraints: NormalizedPhase4Constraints
): {
  all: ValidationMethodCandidate[];
  filtered: ValidationMethodCandidate[];
  selected: ValidationMethodCandidate;
} {
  const all = generateTestCandidates(core, constraints);
  const filtered = filterCandidates(all, core, constraints);
  const selected = selectBestCandidate(all, core, constraints);
  return { all, filtered, selected };
}
