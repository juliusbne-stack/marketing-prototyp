export type ProjectAccent = {
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
};

const ACCENTS: ProjectAccent[] = [
  {
    iconBg: "bg-sky-100",
    iconColor: "text-sky-700",
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
  },
  {
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
  },
  {
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
  },
  {
    iconBg: "bg-violet-100",
    iconColor: "text-violet-700",
    badgeBg: "bg-violet-100",
    badgeText: "text-violet-800",
  },
  {
    iconBg: "bg-orange-100",
    iconColor: "text-orange-700",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-800",
  },
  {
    iconBg: "bg-rose-100",
    iconColor: "text-rose-700",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-800",
  },
];

/** Stable decorative accent from project id (not an evidence/status signal). */
export function getProjectAccent(id: string): ProjectAccent {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ACCENTS[hash % ACCENTS.length];
}

export const PHASE_BADGE_STYLES: Record<
  number,
  { badgeBg: string; badgeText: string }
> = {
  1: { badgeBg: "bg-sky-100", badgeText: "text-sky-800" },
  2: { badgeBg: "bg-teal-100", badgeText: "text-teal-800" },
  3: { badgeBg: "bg-amber-100", badgeText: "text-amber-800" },
  4: { badgeBg: "bg-emerald-100", badgeText: "text-emerald-800" },
  5: { badgeBg: "bg-violet-100", badgeText: "text-violet-800" },
};

export function getPhaseBadgeStyle(phase: number) {
  return (
    PHASE_BADGE_STYLES[phase] ?? {
      badgeBg: "bg-accent-soft",
      badgeText: "text-accent",
    }
  );
}
