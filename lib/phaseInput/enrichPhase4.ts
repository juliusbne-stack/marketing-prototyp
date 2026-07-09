import type { ProcessedStep } from "@/lib/phase4/guards";
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

const METHOD_ALTERNATIVE_ACTIVITIES: Record<string, string[]> = {
  umfrage: [
    "Kurze Online-Umfrage mit 5–8 Fragen erstellen",
    "Zielgruppe über vorhandene Kanäle zur Umfrage einladen",
    "Antworten auswerten und gegen Erfolgskriterium prüfen",
  ],
  landingpage: [
    "Einfache Landingpage mit klarem Nutzenversprechen aufsetzen",
    "Warteliste oder Voranmeldung als Commitment-Signal nutzen",
    "Klicks und Anmeldungen gegen Kriterium auswerten",
  ],
  social: [
    "Test-Post mit klarer Frage/Hypothese formulieren",
    "Reichweite und Reaktionen dokumentieren",
    "Qualitative Rückmeldungen strukturiert festhalten",
  ],
};

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

function pickAlternativeMethod(
  prefs: Record<string, string>
): { id: string; label: string } {
  const preferred = ["umfrage", "landingpage", "social", "anzeigen", "vor_ort", "mvp"];
  for (const id of preferred) {
    if (prefs[id] === "ja") {
      return { id, label: METHOD_LABELS[id] ?? id };
    }
  }
  for (const id of preferred) {
    if (prefs[id] === "egal") {
      return { id, label: METHOD_LABELS[id] ?? id };
    }
  }
  return { id: "umfrage", label: "Online-Umfrage" };
}

function rewriteExcludedMethodStep(
  step: ProcessedStep,
  excludedLabel: string,
  excludedKeywords: string[],
  alternative: { id: string; label: string }
): ProcessedStep {
  const note = `${excludedLabel} wurden ausgeschlossen (deine Angabe) → ${alternative.label} vorgeschlagen.`;
  const activities =
    METHOD_ALTERNATIVE_ACTIVITIES[alternative.id] ??
    METHOD_ALTERNATIVE_ACTIVITIES.umfrage!;

  const strip = (text: string) => {
    let result = text;
    for (const keyword of excludedKeywords) {
      result = result.replace(new RegExp(keyword, "gi"), alternative.label);
    }
    return result.replace(/\s{2,}/g, " ").trim();
  };

  return {
    ...step,
    title: strip(step.title),
    description: strip(step.description),
    testDesign: `${alternative.label}: dieselbe Annahme prüfen — die zuvor naheliegende Methode wurde durch deine Angabe ersetzt.`,
    marketingActivities: activities,
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
      const alternative = pickAlternativeMethod(prefs);
      updated = rewriteExcludedMethodStep(
        updated,
        METHOD_LABELS[methodId] ?? methodId,
        keywords,
        alternative
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

  return steps.map((step) => ({
    ...step,
    budgetFrame:
      "Budget offen (deine Angabe) — konservativ dimensioniert, minimaler Aufwand",
    methodWarning: step.methodWarning ? `${step.methodWarning} ${note}` : note,
  }));
}

function applyAssetConstraints(
  steps: ProcessedStep[],
  assets: AssetsValue
): ProcessedStep[] {
  const available = new Set(assets.selected.map((a) => a.toLowerCase()));
  const hasWebsite = available.has("website");
  const hasSocial = available.has("social-media-reichweite");

  return steps.map((step) => {
    const text = stepText(step);
    const warnings: string[] = [];
    if (!hasWebsite && /landingpage|website|webseite/i.test(text)) {
      warnings.push(
        "Website/Landingpage nicht als vorhanden angegeben — Schritt nutzt nur verfügbare Kanäle."
      );
    }
    if (!hasSocial && /social|instagram|facebook/i.test(text)) {
      warnings.push(
        "Social-Media-Reichweite nicht als vorhanden angegeben — alternativer Kanal nötig."
      );
    }
    if (warnings.length === 0) return step;
    const note = warnings.join(" ");
    return {
      ...step,
      methodWarning: step.methodWarning ? `${step.methodWarning} ${note}` : note,
    };
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
    const note = warnings.join(" ");
    return {
      ...step,
      methodWarning: step.methodWarning ? `${step.methodWarning} ${note}` : note,
    };
  });
}

function stepAddressesAccessBuildup(step: ProcessedStep): boolean {
  return /zugang|reichweite|kontakt aufbau|reichweiten|zielgruppe erreichen|anzeigen|ads|werbung/i.test(
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
            "Kleinen Reichweiten- oder Kontaktaufbau-Schritt planen",
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

    return {
      ...updated,
      methodWarning: updated.methodWarning
        ? `${updated.methodWarning} ${ZUGANG_AUFBAU_NOTE}`
        : ZUGANG_AUFBAU_NOTE,
    };
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

  const assets = state.answers.p4_assets;
  if (assets && !assets.skipped && assets.value) {
    result = applyAssetConstraints(result, assets.value as AssetsValue);
  }

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

export function stepTextForTests(step: ProcessedStep): string {
  return stepText(step);
}
