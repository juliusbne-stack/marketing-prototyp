import {
  DEMO_PROJECT_NAME,
  DEMO_PROJECT_SLUG,
} from "@/lib/demo/constants";

function normalizeProjectName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    // Unify dash variants (en-dash/em-dash/minus) so name matching is robust.
    .replace(/[\u2010-\u2015\u2212]/g, "-");
}

/** True when this project is the Nouriva Meals demo instance. */
export function isDemoProject(project: {
  name: string;
}): boolean {
  const normalized = normalizeProjectName(project.name);
  if (!normalized) return false;
  if (normalized === normalizeProjectName(DEMO_PROJECT_NAME)) return true;
  if (normalized.includes(DEMO_PROJECT_SLUG)) return true;
  // Fallback: seeded demo always contains "nouriva" in the title.
  return normalized.includes("nouriva");
}
