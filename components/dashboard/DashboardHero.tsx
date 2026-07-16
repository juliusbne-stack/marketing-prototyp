import { CreateProjectCard } from "./CreateProjectCard";
import { DashboardHeader } from "./DashboardHeader";

/**
 * Compact hero: header illustration + create-project card as one composition.
 * Waves sit at the bottom of the header; the card overlaps them slightly.
 */
export function DashboardHero() {
  return (
    <section className="relative">
      <DashboardHeader />
      {/* Card overlaps the lowest wave band by a few pixels */}
      <div className="relative z-10 -mt-0.5 sm:-mt-1 md:-mt-2 lg:-mt-2.5">
        <CreateProjectCard />
      </div>
    </section>
  );
}
