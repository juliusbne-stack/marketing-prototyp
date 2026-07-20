import { CreateProjectCard } from "./CreateProjectCard";
import { DashboardHeader } from "./DashboardHeader";

/**
 * Compact hero: dark brand panel + create-project card as one composition.
 */
export function DashboardHero() {
  return (
    <section className="relative">
      <DashboardHeader />
      <CreateProjectCard />
    </section>
  );
}
