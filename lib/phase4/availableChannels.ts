import type { PhaseInputState } from "@/lib/phaseInput/types";

/** Stable platform keys for soft-warning backstop (no open vocabulary). */
export const TRACKED_SOCIAL_PLATFORMS = [
  { key: "linkedin", label: "LinkedIn", pattern: /\blinkedin\b/i },
  { key: "xing", label: "Xing", pattern: /\bxing\b/i },
  { key: "facebook", label: "Facebook", pattern: /\bfacebook\b/i },
  { key: "instagram", label: "Instagram", pattern: /\binstagram\b/i },
  { key: "tiktok", label: "TikTok", pattern: /\btiktok\b/i },
  { key: "twitter", label: "X/Twitter", pattern: /\b(twitter|x\.com)\b/i },
  { key: "pinterest", label: "Pinterest", pattern: /\bpinterest\b/i },
  { key: "snapchat", label: "Snapchat", pattern: /\bsnapchat\b/i },
  { key: "youtube", label: "YouTube", pattern: /\byoutube\b/i },
  { key: "reddit", label: "Reddit", pattern: /\breddit\b/i },
] as const;

export type PlatformKey = (typeof TRACKED_SOCIAL_PLATFORMS)[number]["key"];

const SALES_CHANNEL_SIGNALS = [
  { key: "vinted", label: "Vinted", pattern: /\bvinted\b/i },
  { key: "shopify", label: "Shopify", pattern: /\bshopify\b/i },
  {
    key: "eigener-shop",
    label: "Eigener Online-Shop",
    pattern: /\b(eigen(er|en|em)?\s+(online[- ]?)?shop|online[- ]store)\b/i,
  },
] as const;

const AD_CHANNEL_SIGNALS = [
  { key: "google-ads", label: "Google Ads", pattern: /\bgoogle\s*ads?\b/i },
] as const;

export type VerfuegbareKanaeleContext = {
  kanaele: string[];
  vertriebskanaele: string[];
  platformKeys: PlatformKey[];
  quellen: string[];
};

export type AvailableChannelsInput = {
  skills: string | null;
  businessIdea: string | null;
  phaseInputState: PhaseInputState | null | undefined;
  option: {
    title: string;
    summary: string | null;
    prioritizationRationale: string | null;
    statementTexts: string[];
  };
};

type ChannelAccumulator = {
  platformKeys: Set<PlatformKey>;
  labels: Map<string, string>;
  salesLabels: Map<string, string>;
  sources: Set<string>;
};

function addLabel(
  acc: ChannelAccumulator,
  key: string,
  label: string,
  source?: string
) {
  if (!acc.labels.has(key)) {
    acc.labels.set(key, label);
  }
  if (source) acc.sources.add(source);
}

function addSalesLabel(
  acc: ChannelAccumulator,
  key: string,
  label: string,
  source?: string
) {
  addLabel(acc, key, label, source);
  if (!acc.salesLabels.has(key)) {
    acc.salesLabels.set(key, label);
  }
}

function addPlatformFromText(acc: ChannelAccumulator, text: string, source?: string) {
  for (const platform of TRACKED_SOCIAL_PLATFORMS) {
    if (platform.pattern.test(text)) {
      acc.platformKeys.add(platform.key);
      addLabel(acc, platform.key, platform.label, source);
    }
  }
  for (const sales of SALES_CHANNEL_SIGNALS) {
    if (sales.pattern.test(text)) {
      addSalesLabel(acc, sales.key, sales.label, source);
    }
  }
  for (const ads of AD_CHANNEL_SIGNALS) {
    if (ads.pattern.test(text)) {
      addLabel(acc, ads.key, ads.label, source);
    }
  }
}

function methodAvailable(
  pref: string | undefined
): pref is "ja" | "egal" {
  return pref === "ja" || pref === "egal";
}

export function deriveAvailableChannels(
  input: AvailableChannelsInput
): VerfuegbareKanaeleContext {
  const acc: ChannelAccumulator = {
    platformKeys: new Set(),
    labels: new Map(),
    salesLabels: new Map(),
    sources: new Set(),
  };

  if (input.skills?.trim()) {
    addPlatformFromText(acc, input.skills, "Profil-Skills");
  }
  if (input.businessIdea?.trim()) {
    addPlatformFromText(acc, input.businessIdea, "Geschäftsidee");
  }

  const answers = input.phaseInputState?.answers ?? {};
  const methoden = answers.p4_methoden;
  if (methoden && !methoden.skipped && methoden.value) {
    const prefs = methoden.value as Record<string, string>;
    if (methodAvailable(prefs.social)) {
      addLabel(acc, "instagram", "Instagram", "Fragebogen: Social-Media-Post");
      addLabel(acc, "tiktok", "TikTok", "Fragebogen: Social-Media-Post");
      acc.platformKeys.add("instagram");
      acc.platformKeys.add("tiktok");
    }
    if (methodAvailable(prefs.anzeigen)) {
      const skillBlob = input.skills ?? "";
      if (/\binstagram\b/i.test(skillBlob)) {
        addLabel(acc, "instagram", "Instagram", "Fragebogen: Bezahlte Anzeigen");
        acc.platformKeys.add("instagram");
      }
      addLabel(acc, "google-ads", "Google Ads", "Fragebogen: Bezahlte Anzeigen");
    }
  }

  const kapazitaet = answers.p4_kapazitaet;
  if (kapazitaet && !kapazitaet.skipped && kapazitaet.value) {
    const skills = (kapazitaet.value as { skills: string[] }).skills ?? [];
    if (skills.some((skill) => /content/i.test(skill))) {
      addLabel(acc, "instagram", "Instagram", "Fragebogen: Content-Fähigkeit");
      addLabel(acc, "tiktok", "TikTok", "Fragebogen: Content-Fähigkeit");
      acc.platformKeys.add("instagram");
      acc.platformKeys.add("tiktok");
    }
    if (skills.some((skill) => /anzeigen/i.test(skill))) {
      acc.sources.add("Fragebogen: Anzeigen-Fähigkeit");
    }
  }

  const assets = answers.p4_assets;
  if (assets && !assets.skipped && assets.value) {
    const payload = assets.value as { selected?: string[]; sonstiges?: string };
    if (payload.sonstiges?.trim()) {
      addPlatformFromText(acc, payload.sonstiges, "Fragebogen: eingesetzte Mittel");
    }
    for (const asset of payload.selected ?? []) {
      if (/social/i.test(asset)) {
        addLabel(acc, "instagram", "Instagram", "Fragebogen: Social-Media-Reichweite");
        addLabel(acc, "tiktok", "TikTok", "Fragebogen: Social-Media-Reichweite");
        acc.platformKeys.add("instagram");
        acc.platformKeys.add("tiktok");
      }
      if (/website/i.test(asset)) {
        addSalesLabel(acc, "website", "Website", "Fragebogen: Website");
      }
    }
  }

  const optionBlob = [
    input.option.title,
    input.option.summary,
    input.option.prioritizationRationale,
    ...input.option.statementTexts,
  ]
    .filter(Boolean)
    .join(" ");
  if (optionBlob.trim()) {
    addPlatformFromText(acc, optionBlob, "Priorisierte Strategieoption");
    if (/\b(micro[- ]?influencer|mikro[- ]?influencer|influencer)\b/i.test(optionBlob)) {
      addLabel(acc, "instagram", "Instagram", "Strategieoption: Influencer");
      addLabel(acc, "tiktok", "TikTok", "Strategieoption: Influencer");
      acc.platformKeys.add("instagram");
      acc.platformKeys.add("tiktok");
    }
  }

  return {
    kanaele: [...acc.labels.values()],
    vertriebskanaele: [...acc.salesLabels.values()],
    platformKeys: [...acc.platformKeys],
    quellen: [...acc.sources],
  };
}

export function buildVerfuegbareKanaeleContext(
  input: AvailableChannelsInput
): VerfuegbareKanaeleContext {
  return deriveAvailableChannels(input);
}

function allowedPlatformSet(
  availablePlatformKeys: ReadonlySet<PlatformKey> | readonly PlatformKey[]
): Set<PlatformKey> {
  return availablePlatformKeys instanceof Set
    ? availablePlatformKeys
    : new Set(availablePlatformKeys);
}

export function findForeignPlatformsInText(
  text: string,
  availablePlatformKeys: ReadonlySet<PlatformKey> | readonly PlatformKey[]
): string[] {
  if (!text.trim()) return [];

  const allowed = allowedPlatformSet(availablePlatformKeys);
  const foreign: string[] = [];

  for (const platform of TRACKED_SOCIAL_PLATFORMS) {
    if (platform.pattern.test(text) && !allowed.has(platform.key)) {
      foreign.push(platform.label);
    }
  }

  return foreign;
}

export function findForeignPlatformsInChannel(
  channel: string | null | undefined,
  availablePlatformKeys: ReadonlySet<PlatformKey> | readonly PlatformKey[]
): string[] {
  if (!channel?.trim()) return [];
  return findForeignPlatformsInText(channel, availablePlatformKeys);
}

export function findForeignPlatformsInStepContent(
  step: {
    channel?: string | null;
    title?: string;
    description?: string;
    testDesign?: string;
    validationQuestion?: string;
    marketingActivities?: string[];
  },
  availablePlatformKeys: ReadonlySet<PlatformKey> | readonly PlatformKey[]
): string[] {
  const blob = [
    step.channel ?? "",
    step.title ?? "",
    step.description ?? "",
    step.testDesign ?? "",
    step.validationQuestion ?? "",
    ...(step.marketingActivities ?? []),
  ].join(" ");

  return findForeignPlatformsInText(blob, availablePlatformKeys);
}

export function buildForeignPlatformMethodWarning(platformLabels: string[]): string {
  const names = platformLabels.join(", ");
  return `Hinweis: Der gewählte Kanal nennt ${names}, obwohl diese Plattform nicht aus deinem Profil, Fragebogen oder der Strategieoption ableitbar ist. Prüfe die Kanalwahl vor der Übernahme — der Schritt bleibt übernehmbar.`;
}
