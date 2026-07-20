import { HeaderIllustration } from "./HeaderIllustration";

export function DashboardHeader() {
  return (
    <header className="dashboard-hero relative h-[148px] overflow-hidden rounded-3xl bg-linear-to-br from-brand-dark via-brand-dark to-accent-deep/45 sm:h-[160px] md:h-[172px] lg:h-[180px]">
      {/* Decorative illustration — bottom-aligned so waves meet the project card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 z-[1] hidden h-[138px] w-[48%] max-w-[520px] overflow-visible md:block lg:h-[152px] lg:w-[50%]"
      >
        <HeaderIllustration className="h-full w-full" />
      </div>

      {/* Compact motif on small tablets only (not phones) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 z-[1] hidden h-[108px] w-[44%] overflow-visible opacity-85 sm:block md:hidden"
      >
        <HeaderIllustration className="h-full w-full" />
      </div>

      {/* Title block — eyebrow + headline + supporting line */}
      <div className="relative z-10 max-w-[520px] px-5 pt-5 pr-3 sm:max-w-[560px] sm:px-6 sm:pt-6 lg:max-w-[600px] lg:pr-6">
        <p className="font-heading text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-mint sm:text-xs">
          Marketingstrategie-Prototyp
        </p>
        <h1 className="mt-1.5 font-heading text-[22px] font-bold leading-tight text-white sm:mt-2 sm:text-[25px] lg:text-[28px]">
          Deine Strategie, in fünf klaren Phasen.
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65 sm:mt-2.5">
          Entwickle hypothesen- und evidenzbasiert eine Marketingstrategie für
          dein Start-up — von der Analyse bis zur Roadmap.
        </p>
      </div>
    </header>
  );
}
