import type { PhaseInputState } from "@/lib/phaseInput/types";
import type {
  MethodAvailability,
  NormalizedPhase4Constraints,
} from "./validationCoreTypes";

function methodPrefToAvailability(
  pref: string | undefined,
  defaultWhenMissing: MethodAvailability = "UNKNOWN"
): MethodAvailability {
  if (pref === "ja") return "AVAILABLE";
  if (pref === "nein") return "EXCLUDED";
  if (pref === "egal") return "AVAILABLE_WITH_SETUP";
  return defaultWhenMissing;
}

function assetSelected(assets: string[] | undefined, needle: string): boolean {
  if (!assets) return false;
  return assets.some((a) => a.toLowerCase().includes(needle));
}

/** Central normalization of Phase-4 questionnaire answers. */
export function normalizePhase4Constraints(
  state: PhaseInputState | null | undefined
): NormalizedPhase4Constraints {
  const answers = state?.answers ?? {};
  const methoden = answers.p4_methoden;
  const methodPrefs =
    methoden && !methoden.skipped && methoden.value
      ? (methoden.value as Record<string, string>)
      : {};

  const assetsAnswer = answers.p4_assets;
  const assets =
    assetsAnswer && !assetsAnswer.skipped && assetsAnswer.value
      ? ((assetsAnswer.value as { selected: string[] }).selected ?? [])
      : [];

  const budgetAnswer = answers.p4_budget_zeit;
  const budgetVal =
    budgetAnswer && !budgetAnswer.skipped && budgetAnswer.value
      ? (budgetAnswer.value as {
          budgetEur: number | null;
          budgetSkipped: boolean;
          weeks: number | null;
          weeksSkipped: boolean;
        })
      : null;

  const zugangAnswer = answers.p4_zielgruppen_zugang;
  const zugangRaw =
    zugangAnswer && !zugangAnswer.skipped && zugangAnswer.value
      ? (zugangAnswer.value as string)
      : null;

  const kapazitaetAnswer = answers.p4_kapazitaet;
  const skills =
    kapazitaetAnswer && !kapazitaetAnswer.skipped && kapazitaetAnswer.value
      ? ((kapazitaetAnswer.value as { skills: string[] }).skills ?? [])
      : [];

  const oeffentlichkeitAnswer = answers.p4_oeffentlichkeit;
  const oeffentlichkeit =
    oeffentlichkeitAnswer &&
    !oeffentlichkeitAnswer.skipped &&
    oeffentlichkeitAnswer.value
      ? (oeffentlichkeitAnswer.value as string)
      : null;

  const hasSocialReach = assetSelected(assets, "social-media-reichweite");
  const socialExcluded = methodPrefs.social === "nein";

  return {
    socialMediaPosting: socialExcluded
      ? "EXCLUDED"
      : methodPrefToAvailability(methodPrefs.social, "AVAILABLE_WITH_SETUP"),
    ownedSocialReach: hasSocialReach
      ? "AVAILABLE"
      : assetsAnswer == null || assetsAnswer.skipped
        ? "UNKNOWN"
        : "LIMITED",
    directOutreach:
      zugangRaw === "vorhanden"
        ? "AVAILABLE"
        : zugangRaw === "teilweise"
          ? "AVAILABLE_WITH_SETUP"
          : zugangRaw === "muss erst aufgebaut werden"
            ? "AVAILABLE_WITH_SETUP"
            : "UNKNOWN",
    interviews: methodPrefToAvailability(methodPrefs.interviews),
    surveys: methodPrefToAvailability(methodPrefs.umfrage),
    landingPage: methodPrefToAvailability(methodPrefs.landingpage),
    paidAds: methodPrefToAvailability(methodPrefs.anzeigen),
    mvp: methodPrefToAvailability(methodPrefs.mvp),
    onSite: methodPrefToAvailability(methodPrefs.vor_ort),
    communityAccess:
      zugangRaw === "vorhanden" || zugangRaw === "teilweise"
        ? "AVAILABLE_WITH_SETUP"
        : zugangRaw === "muss erst aufgebaut werden"
          ? "AVAILABLE_WITH_SETUP"
          : "UNKNOWN",
    targetGroupAccess:
      zugangRaw === "vorhanden" ||
      zugangRaw === "teilweise" ||
      zugangRaw === "muss erst aufgebaut werden"
        ? zugangRaw
        : "UNKNOWN",
    budgetLimited: budgetVal != null && !budgetVal.budgetSkipped && budgetVal.budgetEur != null && budgetVal.budgetEur < 500,
    budgetSkipped: budgetVal?.budgetSkipped ?? true,
    weeksLimited: budgetVal != null && !budgetVal.weeksSkipped && budgetVal.weeks != null && budgetVal.weeks <= 2,
    weeksSkipped: budgetVal?.weeksSkipped ?? true,
    budgetEur: budgetVal?.budgetEur ?? null,
    weeks: budgetVal?.weeks ?? null,
    hasWebsite: assetSelected(assets, "website"),
    hasEmailList: assetSelected(assets, "e-mail"),
    hasDirectContacts: assetSelected(assets, "kontakte"),
    canRunAds: skills.some((s) => s.toLowerCase().includes("anzeigen")),
    canBuildLandingPage: skills.some((s) =>
      s.toLowerCase().includes("landingpage")
    ),
    canCreateContent: skills.some((s) =>
      s.toLowerCase().includes("content")
    ),
    prefersDiscrete: oeffentlichkeit === "lieber klein/verdeckt",
  };
}

export function isSocialMediaAllowed(
  constraints: NormalizedPhase4Constraints
): boolean {
  return constraints.socialMediaPosting !== "EXCLUDED";
}

export function hasOwnedSocialReach(
  constraints: NormalizedPhase4Constraints
): boolean {
  return constraints.ownedSocialReach === "AVAILABLE";
}

export function constraintsToLlmSummary(
  constraints: NormalizedPhase4Constraints
): Record<string, string> {
  return {
    socialMediaPosting: constraints.socialMediaPosting,
    socialMediaReachForValidation: constraints.ownedSocialReach,
    hinweisReichweite:
      constraints.ownedSocialReach === "LIMITED"
        ? "Eigene Social-Media-Reichweite ist nicht für die Validierung freigegeben — Social Media bleibt zulässig, benötigt aber einen externen Verbreitungsweg auf den eigenen Profil- oder Vertriebskanälen (bestehende Community dort, Direktansprache, Partner/Multiplikator/Influencer/Kooperation/Creator, bezahlte Ausspielung/Ads/Anzeigen). Nicht ausgewählt bedeutet nicht zwingend nicht vorhanden."
        : constraints.ownedSocialReach === "AVAILABLE"
          ? "Eigene Social-Media-Reichweite ist für die Validierung freigegeben."
          : "Einsatzbereitschaft der eigenen Social-Media-Reichweite unbekannt — Zugangsweg explizit benennen.",
    interviews: constraints.interviews,
    directOutreach: constraints.directOutreach,
    targetGroupAccess: constraints.targetGroupAccess,
    budget: constraints.budgetSkipped
      ? "nicht angegeben"
      : constraints.budgetEur != null
        ? `${constraints.budgetEur} EUR`
        : "nicht angegeben",
    zeitraum: constraints.weeksSkipped
      ? "nicht angegeben"
      : constraints.weeks != null
        ? `${constraints.weeks} Wochen`
        : "nicht angegeben",
  };
}
