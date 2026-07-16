import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEMO_FIXTURE } from "@/scripts/demo-fixture-data";
import { demoDelay } from "@/lib/demo/delay";
import {
  PHASE1_MODULE_LABELS,
  type Phase1StreamEvent,
  type PreviewStatement,
} from "@/lib/phase1/events";
import type { Phase1ModuleKey } from "@/lib/phase1/types";
import type { PestelRelevance } from "@/lib/schemas/phase1";

const statementSelect = {
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
  segmentLabel: true,
  segmentAspect: true,
  competitorLabel: true,
  competitorAspect: true,
} satisfies Prisma.StatementSelect;

function phase1Fixtures() {
  return Object.values(DEMO_FIXTURE.statements).filter((s) => s.phase === 1);
}

function toPreview(fixture: (typeof DEMO_FIXTURE.statements)[string]): PreviewStatement {
  return {
    category: fixture.category,
    content: fixture.content,
    evidenceStatus: fixture.evidenceStatus,
    origin: fixture.origin,
    justification: fixture.justification ?? "",
    sourceRef: fixture.sourceRef ?? null,
    uncertainty: fixture.uncertainty ?? null,
    segmentLabel: fixture.segmentLabel ?? null,
    segmentAspect: fixture.segmentAspect ?? null,
    competitorLabel: fixture.competitorLabel ?? null,
    competitorAspect: fixture.competitorAspect ?? null,
  };
}

function moduleForFixture(
  fixture: (typeof DEMO_FIXTURE.statements)[string],
  competitorBatchIndex: Map<string, number>
): Phase1ModuleKey {
  const cat = fixture.category;
  if (cat.startsWith("PESTEL_")) return "pestel";
  if (cat === "TARGET_SEGMENT" || cat === "CUSTOMER_PROBLEM") return "segments";
  if (cat === "RESOURCE") return "resources";
  if (cat === "COMPETITOR") {
    const label = fixture.competitorLabel ?? "unknown";
    const batch = competitorBatchIndex.get(label) ?? 0;
    if (batch <= 0) return "competitors_batch_1";
    if (batch === 1) return "competitors_batch_2";
    return "competitors_batch_3";
  }
  return "synthesis";
}

function buildCompetitorBatchIndex(
  fixtures: ReturnType<typeof phase1Fixtures>
): Map<string, number> {
  const labels: string[] = [];
  for (const fixture of fixtures) {
    if (fixture.category !== "COMPETITOR" || !fixture.competitorLabel) continue;
    if (!labels.includes(fixture.competitorLabel)) {
      labels.push(fixture.competitorLabel);
    }
  }
  const map = new Map<string, number>();
  labels.forEach((label, index) => {
    map.set(label, Math.min(2, Math.floor(index / 3)));
  });
  return map;
}

async function persistPhase1Drafts(projectId: string) {
  const fixtures = phase1Fixtures();
  const pestelRelevance = DEMO_FIXTURE.project.pestelRelevance as PestelRelevance[];

  return prisma.$transaction(async (tx) => {
    await tx.statement.deleteMany({
      where: { projectId, phase: 1, adopted: false },
    });

    await tx.statement.createMany({
      data: fixtures.map((fixture) => ({
        projectId,
        phase: 1,
        category: fixture.category,
        content: fixture.content,
        evidenceStatus: fixture.evidenceStatus,
        origin: fixture.origin,
        justification: fixture.justification ?? null,
        sourceRef: fixture.sourceRef ?? null,
        uncertainty: fixture.uncertainty ?? null,
        segmentLabel: fixture.segmentLabel ?? null,
        segmentAspect: fixture.segmentAspect ?? null,
        competitorLabel: fixture.competitorLabel ?? null,
        competitorAspect: fixture.competitorAspect ?? null,
        adopted: false,
        isCritical: false,
      })),
    });

    await tx.project.update({
      where: { id: projectId },
      data: { pestelRelevance: pestelRelevance as Prisma.InputJsonValue },
    });

    const statements = await tx.statement.findMany({
      where: { projectId, phase: 1 },
      orderBy: { createdAt: "asc" },
      select: statementSelect,
    });

    return { statements, pestelRelevance };
  });
}

/** Non-streaming response when Phase 1 already has adopted statements. */
export async function serveDemoPhase1Json(projectId: string) {
  await demoDelay(600);
  const adoptedCount = await prisma.statement.count({
    where: { projectId, phase: 1, adopted: true },
  });
  if (adoptedCount > 0) {
    const statements = await prisma.statement.findMany({
      where: { projectId, phase: 1 },
      orderBy: { createdAt: "asc" },
      select: statementSelect,
    });
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { pestelRelevance: true },
    });
    return {
      statements,
      pestelRelevance: (project.pestelRelevance ?? []) as PestelRelevance[],
      incremental: true,
      filteredDuplicateCount: 0,
    };
  }
  const result = await persistPhase1Drafts(projectId);
  return {
    ...result,
    incremental: false,
    filteredDuplicateCount: 0,
  };
}

/** NDJSON stream that looks like the real Phase-1 analysis pipeline. */
export function serveDemoPhase1Stream(projectId: string): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: Phase1StreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        const runId = randomUUID();
        emit({ type: "analysis_started", runId });
        await demoDelay(200);
        emit({ type: "anchor_started" });
        await demoDelay(350);
        emit({ type: "anchor_completed" });

        const fixtures = phase1Fixtures();
        const competitorBatchIndex = buildCompetitorBatchIndex(fixtures);

        const byModule = new Map<Phase1ModuleKey, typeof fixtures>();
        for (const fixture of fixtures) {
          const module = moduleForFixture(fixture, competitorBatchIndex);
          const list = byModule.get(module) ?? [];
          list.push(fixture);
          byModule.set(module, list);
        }

        const moduleOrder: Phase1ModuleKey[] = [
          "pestel",
          "segments",
          "resources",
          "competitors_batch_1",
          "competitors_batch_2",
          "competitors_batch_3",
          "synthesis",
        ];

        let previewIndex = 0;
        for (const module of moduleOrder) {
          const items = byModule.get(module);
          if (!items?.length) continue;

          emit({
            type: "module_started",
            module,
            label: PHASE1_MODULE_LABELS[module],
          });
          await demoDelay(280);

          for (const fixture of items) {
            emit({
              type: "statement",
              module,
              previewId: `demo-p1-${previewIndex++}`,
              data: toPreview(fixture),
            });
            await demoDelay(35);
          }

          emit({
            type: "module_completed",
            module,
            itemCount: items.length,
          });
          await demoDelay(120);
        }

        emit({ type: "synthesis_started" });
        await demoDelay(250);
        emit({ type: "synthesis_completed" });
        emit({ type: "consistency_check_started" });
        await demoDelay(300);
        emit({ type: "persisting" });
        await demoDelay(200);

        const result = await persistPhase1Drafts(projectId);
        emit({
          type: "final",
          data: {
            statements: result.statements,
            pestelRelevance: result.pestelRelevance,
            incremental: false,
            filteredDuplicateCount: 0,
          },
        });
        controller.close();
      } catch {
        emit({
          type: "error",
          recoverable: true,
          message:
            "Die Analyse konnte nicht erstellt werden. Erneut versuchen — deine Eingaben bleiben erhalten.",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
