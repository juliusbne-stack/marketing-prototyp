import { ChartNoAxesCombined } from "lucide-react";
import { HeaderIllustration } from "./HeaderIllustration";

export function DashboardHeader() {
  return (
    <header className="relative h-[148px] sm:h-[160px] md:h-[172px] lg:h-[180px]">
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

      {/* Title block — more top room free now that profile lives in the banner */}
      <div className="relative z-10 max-w-[520px] pt-2 pr-3 sm:max-w-[560px] sm:pt-3 lg:max-w-[600px] lg:pr-6">
        <div className="flex items-start gap-3 sm:gap-3.5">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-soft sm:h-11 sm:w-11">
            <ChartNoAxesCombined
              className="h-5 w-5 text-accent sm:h-[22px] sm:w-[22px]"
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading text-[22px] font-semibold leading-tight text-text sm:text-[25px]">
              Marketingstrategie-Prototyp
            </h1>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-text-muted">
              Entwickle in fünf Phasen eine hypothesen- und evidenzbasierte
              Marketingstrategie für dein Start-up.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
