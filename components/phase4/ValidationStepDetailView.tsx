import { Fragment } from "react";
import { EvidenceBadge } from "@/components/statements/EvidenceBadge";
import {
  EVALUATION_MODE_LABEL,
  LAUFMODUS_FULL_LABEL,
  MARKETING_ACTIVITIES_HEADING,
  METRIC_ROLE_LABEL,
  PROXY_STRENGTH_LABEL,
  SIGNAL_CATEGORY_LABEL,
  STEP_TYPE_LABEL,
  STRATEGY_DIMENSION_LABEL,
  TEST_SUBJECT_LABEL,
  stepCopy,
} from "@/lib/labels/phase4";
import { getAnchorAssumptionGroupHeading } from "@/lib/anchorAssumptionLabel";
import type { ValidationStepDetailData } from "@/lib/validationStepDetail";
import { ValidationStepDetailToolbar } from "./ValidationStepDetailToolbar";
import "./validation-step-detail.css";

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="validation-step-detail-field">
      <dt className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] leading-snug text-text">{children}</dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="validation-step-detail-section rounded-[10px] border border-border bg-surface p-4">
      <h2 className="font-heading text-[16px] font-semibold text-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function ValidationStepDetailView({
  data,
}: {
  data: ValidationStepDetailData;
}) {
  const copy = stepCopy(data.step.stepType);

  return (
    <article className="validation-step-detail-page mx-auto w-full max-w-[1480px] px-5 py-4">
      <ValidationStepDetailToolbar projectId={data.project.id} />

      <header className="validation-step-detail-header mb-4 rounded-[10px] border border-border bg-surface px-5 py-4">
        <p className="text-[12px] font-medium uppercase tracking-wide text-text-muted">
          {data.project.name}
        </p>
        <p className="mt-1 text-[13px] text-text-muted">Phase 4 · Validierende Umsetzung</p>
        <h1 className="mt-2 font-heading text-[26px] font-semibold leading-tight text-text">
          {data.step.title}
        </h1>
        <p className="mt-2 text-[14px] text-text-muted">
          Priorisierte Strategieoption:{" "}
          <span className="font-medium text-text">{data.option.title}</span>
        </p>
        <p className="mt-2 text-[12px] text-text-muted">
          Demonstrationsdaten — fiktiv
        </p>
      </header>

      <section className="validation-step-detail-assumption mb-4 rounded-[10px] border-2 border-accent/25 bg-accent-soft/20 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-text-muted">
              {getAnchorAssumptionGroupHeading(data.assumption.evidenceStatus)}
            </p>
            {data.step.strategyDimension && (
              <p className="mt-1 text-[12px] text-text-muted">
                Strategische Dimension:{" "}
                {STRATEGY_DIMENSION_LABEL[data.step.strategyDimension]}
              </p>
            )}
          </div>
          <EvidenceBadge status={data.assumption.evidenceStatus} />
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-text">
          {data.assumption.content}
        </p>
        {data.assumption.uncertainty?.trim() && (
          <p className="mt-3 rounded-md border border-border/80 bg-surface/80 px-3 py-2 text-[13px] leading-relaxed text-text-muted">
            <span className="font-medium text-text">Unsicherheit: </span>
            {data.assumption.uncertainty}
          </p>
        )}
      </section>

      <div className="validation-step-detail-grid mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <DetailSection title="Erkenntnisziel">
            <p className="text-[14px] leading-relaxed text-text">{data.step.description}</p>
          </DetailSection>

          {data.step.validationQuestion && (
            <DetailSection title={copy.questionHeading}>
              <p className="text-[14px] leading-relaxed text-text">
                {data.step.validationQuestion}
              </p>
            </DetailSection>
          )}

          {data.step.testDesign && (
            <DetailSection title={copy.designHeading}>
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-text">
                {data.step.testDesign}
              </p>
            </DetailSection>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <DetailSection title="Durchführung">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.step.channel && (
                <DetailField label="Kanal">{data.step.channel}</DetailField>
              )}
              {data.step.testSubject && (
                <DetailField label="Testgegenstand">
                  {TEST_SUBJECT_LABEL[data.step.testSubject]}
                </DetailField>
              )}
              {data.step.timeframe && (
                <DetailField label="Zeitrahmen">{data.step.timeframe}</DetailField>
              )}
              {data.step.budgetFrame && (
                <DetailField label="Budgetrahmen">{data.step.budgetFrame}</DetailField>
              )}
              <DetailField label="Schritttyp">
                {STEP_TYPE_LABEL[data.step.stepType]}
              </DetailField>
              <DetailField label="Laufmodus">
                {LAUFMODUS_FULL_LABEL[data.step.laufmodus]}
              </DetailField>
              {data.step.basiertAufUmsetzung && (
                <DetailField label="Abhängigkeit">
                  Nach „{data.step.basiertAufUmsetzung.title}“
                </DetailField>
              )}
            </dl>
          </DetailSection>

          {data.step.marketingActivities &&
            data.step.marketingActivities.length > 0 && (
              <DetailSection title={MARKETING_ACTIVITIES_HEADING}>
                <ol className="list-decimal space-y-1.5 pl-5 text-[14px] leading-relaxed text-text">
                  {data.step.marketingActivities.map((activity) => (
                    <li key={activity}>{activity}</li>
                  ))}
                </ol>
              </DetailSection>
            )}
        </div>
      </div>

      {data.metrics.length > 0 && (
        <section className="validation-step-detail-metrics mb-4 rounded-[10px] border border-border bg-surface p-4">
          <h2 className="font-heading text-[16px] font-semibold text-text">Messlogik</h2>
          <div className="mt-3">
            <table className="validation-step-detail-table w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  <th className="px-2 py-2">Messgröße</th>
                  <th className="px-2 py-2">Rolle</th>
                  <th className="px-2 py-2">Signalart</th>
                  <th className="px-2 py-2">Proxy</th>
                  <th className="px-2 py-2">Auswertung</th>
                  <th className="px-2 py-2">Erfolgskriterium</th>
                  <th className="px-2 py-2">Misserfolgskriterium</th>
                </tr>
              </thead>
              <tbody>
                {data.metrics.map((metric) => (
                  <Fragment key={metric.id}>
                    <tr
                      className={`border-b border-border/70 align-top ${
                        metric.metricRole === "DECISIVE"
                          ? "bg-accent-soft/25"
                          : ""
                      }`}
                    >
                      <td className="px-2 py-2 font-medium text-text">
                        {metric.name}
                        {metric.metricRole === "DECISIVE" && (
                          <span className="mt-1 block text-[11px] font-normal text-text-muted">
                            Entscheidende Messgröße
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-text">
                        {METRIC_ROLE_LABEL[metric.metricRole]}
                      </td>
                      <td className="px-2 py-2 text-text">
                        {metric.signalCategory
                          ? SIGNAL_CATEGORY_LABEL[metric.signalCategory]
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-text">
                        {metric.proxyStrength
                          ? PROXY_STRENGTH_LABEL[metric.proxyStrength]
                          : "—"}
                      </td>
                      <td className="px-2 py-2 text-text">
                        {EVALUATION_MODE_LABEL[metric.evaluationMode]}
                      </td>
                      <td className="px-2 py-2 text-text">{metric.successCriterion}</td>
                      <td className="px-2 py-2 text-text">{metric.failureCriterion}</td>
                    </tr>
                    {metric.signalRationale?.trim() && (
                      <tr className="border-b border-border/50 bg-background/50">
                        <td
                          colSpan={7}
                          className="px-2 py-2 text-[12px] leading-relaxed text-text-muted"
                        >
                          <span className="font-medium text-text">Signalbegründung: </span>
                          {metric.signalRationale}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.step.methodWarning?.trim() && (
        <section className="validation-step-detail-warning rounded-[10px] border border-border bg-background px-4 py-3 text-[13px] leading-relaxed text-text-muted">
          <span className="font-medium text-text">Methodischer Hinweis: </span>
          {data.step.methodWarning}
        </section>
      )}
    </article>
  );
}
