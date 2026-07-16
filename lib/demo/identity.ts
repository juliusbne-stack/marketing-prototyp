import {
  DEMO_PROJECT_NAME,
  DEMO_PROJECT_SLUG,
} from "@/lib/demo/constants";

/** True when this project is the Nouriva Meals demo instance. */
export function isDemoProject(project: {
  name: string;
}): boolean {
  const name = project.name.trim();
  if (name === DEMO_PROJECT_NAME) return true;
  return name.toLowerCase().includes(DEMO_PROJECT_SLUG);
}
