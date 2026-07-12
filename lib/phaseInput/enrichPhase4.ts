import type { ProcessedStep } from "@/lib/phase4/guards";
import { normalizePhase4Constraints } from "@/lib/phase4/constraints";
import {
  hasExternalDistributionPath as stepHasExternalPath,
  mentionsSocialInStep,
} from "@/lib/phase4/consistencyCheck";
import type {
  AssetsValue,
  BudgetZeitValue,
  KapazitaetValue,
  PhaseInputState,
} from "@/lib/phaseInput/types";

const METHOD_KEYWORDS: Record<string, string[]> = {
  interviews: ["interview", "gespräch", "befragung"],
  umfrage: ["umfrage", "survey", "fragebogen"],
  landingpage: ["landingpage", "warteliste", "landing page"],
  anzeigen: ["anzeige", "ads", "werbung", "google ads", "meta ads"],
  social: ["social", "instagram", "linkedin", "facebook", "tiktok"],
  mvp: ["mvp", "mini-angebot", "prototyp"],
  vor_ort: ["vor-ort", "studio", "vor ort"],
};

const METHOD_LABELS: Record<string, string> = {
  interviews: "Interviews",
  umfrage: "Online-Umfrage",
  landingpage: "Landingpage/Warteliste",
  anzeigen: "Bezahlte Test-Anzeigen",
  social: "Social-Media-Post",
  mvp: "Mini-Angebot/MVP",
  vor_ort: "Vor-Ort-Test im Studio",
};

export function stepTextForTests(step: ProcessedStep): string {
  return stepText(step);
}

function stepText(step: ProcessedStep): string {
  return [
    step.title,
    step.description,
    step.testDesign,
    step.channel ?? "",
    ...(step.marketingActivities ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function stepMentionsExcludedMethod(
  step: ProcessedStep,
  keywords: string[]
): boolean {
  const text = stepText(step);
  return keywords.some((keyword) => text.includes(keyword));
}

function appendWarning(step: ProcessedStep, note: string): ProcessedStep {
  return {
    ...step,
    methodWarning: step.methodWarning ? `${step.methodWarning} ${note}` : note,
  };
}

function applyExcludedMethods(
  steps: ProcessedStep[],
  prefs: Record<string, string>
): ProcessedStep[] {
  return steps.map((step) => {
    let updated = step;
    for (const [methodId, pref] of Object.entries(prefs)) {
      if (pref !== "nein") continue;
      const keywords = METHOD_KEYWORDS[methodId] ?? [];
      if (!stepMentionsExcludedMethod(updated, keywords)) continue;
      const label = METHOD_LABELS[methodId] ?? methodId;
      updated = appendWarning(
        updated,
        `${label} sind ausgeschlossen (deine Angabe) — der Entwurf verwendet diese Methode noch und muss angepasst werden.`
      );
    }
    return updated;
  });
}

function applyBudgetConstraints(
  steps: ProcessedStep[],
  value: BudgetZeitValue
): ProcessedStep[] {
  if (!value.budgetSkipped) return steps;

  const note =
    "Budget nicht angegeben (deine Angabe) — Schritte konservativ dimensioniert.";

  return steps.map((step) => appendWarning(step, note));
}

function applyAssetConstraints(
  steps: ProcessedStep[],
  state: PhaseInputState
): ProcessedStep[] {
  const constraints = normalizePhase4Constraints(state);
  const assetsAnswer = state.answers.p4_assets;
  const assets =
    assetsAnswer && !assetsAnswer.skipped && assetsAnswer.value
      ? ((assetsAnswer.value as AssetsValue).selected ?? [])
      : [];
  const available = new Set(assets.map((a) => a.toLowerCase()));
  const hasWebsite = available.has("website");

  return steps.map((step) => {
    const text = stepText(step);
    const warnings: string[] = [];

    if (!hasWebsite && /landingpage|website|webseite/i.test(text)) {
      warnings.push(
        "Website/Landingpage nicht als vorhanden angegeben — Schritt nutzt nur verfügbare Kanäle."
      );
    }

    if (
      constraints.ownedSocialReach === "LIMITED" &&
      mentionsSocialInStep(step) &&
      !stepHasExternalPath(step)
    ) {
      warnings.push(
        "Keine eigene Social-Media-Reichweite vorhanden. Ein Beitrag über den eigenen Account allein wäre nicht aussagekräftig. Lege einen konkreten externen Verbreitungsweg fest, zum Beispiel eine Gründer-Community, gezielte Ansprache, Multiplikatoren oder eine bezahlte Ausspielung."
      );
    }

    if (warnings.length === 0) return step;
    return appendWarning(step, warnings.join(" "));
  });
}

function applyKapazitaetConstraints(
  steps: ProcessedStep[],
  value: KapazitaetValue
): ProcessedStep[] {
  const skills = value.skills.map((s) => s.toLowerCase());
  const canBuildLp = skills.some((s) => s.includes("landingpage"));
  const canAds = skills.some((s) => s.includes("anzeigen"));

  return steps.map((step) => {
    const text = stepText(step);
    const warnings: string[] = [];
    if (!canBuildLp && /landingpage|website bauen/i.test(text)) {
      warnings.push(
        "Landingpage-Bau nicht als Fähigkeit angegeben — vereinfachter Messpunkt nötig."
      );
    }
    if (!canAds && /anzeigen schalten|ads/i.test(text)) {
      warnings.push(
        "Anzeigen schalten nicht als Fähigkeit angegeben — organischer Kanal bevorzugen."
      );
    }
    if (warnings.length === 0) return step;
    return appendWarning(step, warnings.join(" "));
  });
}

function stepAddressesAccessBuildup(step: ProcessedStep): boolean {
  return /zugang|reichweite|kontakt aufbau|reichweiten|zielgruppe erreichen|anzeigen|ads|werbung|community|direktansprache/i.test(
    stepText(step)
  );
}

function stepAssumesDirectAccess(step: ProcessedStep): boolean {
  const text = stepText(step);
  return /bestehende kontakte|e-mail-liste|direkt(e|er|en)?\s+(kontakt|ansprache|einlad)|kundenliste/i.test(
    text
  );
}

const ZUGANG_AUFBAU_NOTE =
  "Zielgruppen-Zugang muss erst aufgebaut werden (deine Angabe) — kein direkter Kontakt vorausgesetzt.";

function applyZugangConstraints(
  steps: ProcessedStep[],
  zugang: string
): ProcessedStep[] {
  if (zugang !== "muss erst aufgebaut werden") return steps;

  return steps.map((step, index) => {
    const needsAccessPrefix =
      index === 0 && !stepAddressesAccessBuildup(step);

    const updated: ProcessedStep = {
      ...step,
      description: needsAccessPrefix
        ? `Zuerst Zugang zur Zielgruppe aufbauen, dann Kernhypothese prüfen. ${step.description}`
        : step.description,
      marketingActivities: needsAccessPrefix
        ? [
            "Passenden Zielgruppenzugang identifizieren (Community, Direktansprache oder Partner)",
            ...step.marketingActivities,
          ].slice(0, 6)
        : step.marketingActivities,
    };

    if (
      !stepAssumesDirectAccess(updated) ||
      stepAddressesAccessBuildup(updated)
    ) {
      return updated;
    }

    return appendWarning(updated, ZUGANG_AUFBAU_NOTE);
  });
}

/** NF1: Sichtbare Hinweise und aktive Anpassung an Phasen-Eingaben. */
export function enrichStepsWithPhaseInputContext(
  steps: ProcessedStep[],
  state: PhaseInputState
): ProcessedStep[] {
  if (steps.length === 0) return steps;

  let result = [...steps];

  const methoden = state.answers.p4_methoden;
  if (methoden && !methoden.skipped && methoden.value) {
    result = applyExcludedMethods(
      result,
      methoden.value as Record<string, string>
    );
  }

  const budgetZeit = state.answers.p4_budget_zeit;
  if (budgetZeit && !budgetZeit.skipped && budgetZeit.value) {
    result = applyBudgetConstraints(
      result,
      budgetZeit.value as BudgetZeitValue
    );
  }

  result = applyAssetConstraints(result, state);

  const kapazitaet = state.answers.p4_kapazitaet;
  if (kapazitaet && !kapazitaet.skipped && kapazitaet.value) {
    result = applyKapazitaetConstraints(
      result,
      kapazitaet.value as KapazitaetValue
    );
  }

  const zugang = state.answers.p4_zielgruppen_zugang;
  if (
    zugang &&
    !zugang.skipped &&
    zugang.value === "muss erst aufgebaut werden"
  ) {
    result = applyZugangConstraints(result, zugang.value);
  }

  return result;
}
