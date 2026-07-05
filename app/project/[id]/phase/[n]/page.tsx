import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatementDemo } from "@/components/phase1/StatementDemo";

const PHASE_INFO: Record<
  number,
  { title: string; description: string; emptyState: string }
> = {
  1: {
    title: "Situationsanalyse",
    description:
      "Aus deinem Start-up-Profil entsteht ein evidenzbewertetes Analysebild mit simulierten Recherchedaten.",
    emptyState:
      "In dieser Phase beschreibst du dein Start-up und erhältst ein Analysebild aus PESTEL, Zielgruppen, Wettbewerb und SWOT. Das Eingabeformular folgt in einem späteren Ausbauschritt des Prototyps.",
  },
  2: {
    title: "Strategieoptionen",
    description:
      "Aus deinem Analysebild entstehen 2–3 vergleichbare Strategieoptionen als Hypothesenbündel.",
    emptyState:
      "In dieser Phase entstehen aus deinem Analysebild 2–3 vergleichbare Strategieoptionen. Verfügbar, sobald Phase 1 einen übernommenen Arbeitsstand hat.",
  },
  3: {
    title: "Bewertung & Priorisierung",
    description:
      "Die Optionen werden anhand von sechs Kriterien verglichen — die Priorisierung entscheidest du.",
    emptyState:
      "In dieser Phase vergleichst du die Strategieoptionen und priorisierst begründet eine davon. Verfügbar, sobald Phase 2 einen übernommenen Arbeitsstand hat.",
  },
  4: {
    title: "Validierende Umsetzung",
    description:
      "Kritische Annahmen der priorisierten Option werden in begrenzte Umsetzungsschritte mit Messpunkten übersetzt.",
    emptyState:
      "In dieser Phase werden die kritischsten Annahmen deiner priorisierten Option in prüfbare Umsetzungsschritte übersetzt. Verfügbar, sobald Phase 3 abgeschlossen ist.",
  },
  5: {
    title: "Lernen & Anpassung",
    description:
      "Marktrückmeldungen aktualisieren den Evidenzstatus deiner Annahmen und führen zu einer Anpassungsentscheidung.",
    emptyState:
      "In dieser Phase erfasst du Marktrückmeldungen und entscheidest über die strategische Anpassung. Verfügbar, sobald Phase 4 einen übernommenen Arbeitsstand hat.",
  },
};

export default async function PhasePage({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}) {
  const { id, n } = await params;
  const phaseNumber = Number(n);
  const phase = PHASE_INFO[phaseNumber];

  if (!phase || !Number.isInteger(phaseNumber)) {
    notFound();
  }

  // M2: demo view in phase 1 to test the statement core components.
  const statements =
    phaseNumber === 1
      ? await prisma.statement.findMany({
          where: { projectId: id, phase: 1 },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            projectId: true,
            phase: true,
            category: true,
            content: true,
            evidenceStatus: true,
            origin: true,
            justification: true,
            sourceRef: true,
            uncertainty: true,
            isCritical: true,
            adopted: true,
          },
        })
      : null;

  return (
    <div>
      <header className="mb-8">
        <h2 className="font-heading text-[22px] font-semibold text-text">
          {phase.title}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{phase.description}</p>
      </header>

      {statements ? (
        <StatementDemo projectId={id} initialStatements={statements} />
      ) : (
        <div className="rounded-[10px] border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          {phase.emptyState}
        </div>
      )}
    </div>
  );
}
