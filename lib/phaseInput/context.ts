import { prisma } from "@/lib/prisma";
import {
  buildPhaseInputContextBlock,
  PHASE2_INPUT_RULES,
  PHASE4_INPUT_RULES,
} from "@/lib/schemas/phaseInput";
import { recordsToState } from "./values";
import { ONBOARDING_META_KEY } from "./types";
import type { PhaseInputPhase } from "./types";

export async function loadPhaseInputs(projectId: string, phase: PhaseInputPhase) {
  const records = await prisma.phaseInput.findMany({
    where: { projectId, phase },
    select: { questionKey: true, value: true, skipped: true },
  });
  return recordsToState(
    phase,
    records.map((record) => ({
      questionKey: record.questionKey,
      value: record.value,
      skipped: record.skipped,
    }))
  );
}

export async function buildPhaseInputLlmContext(
  projectId: string,
  phase: PhaseInputPhase
) {
  const state = await loadPhaseInputs(projectId, phase);
  const answers = Object.fromEntries(
    Object.entries(state.answers).map(([key, answer]) => [key, answer])
  );

  return {
    phasenEingaben: buildPhaseInputContextBlock(phase, answers),
    phasenEingabenRegeln: phase === 2 ? PHASE2_INPUT_RULES : PHASE4_INPUT_RULES,
  };
}

export async function loadPhaseInputsForPage(projectId: string, phase: PhaseInputPhase) {
  const records = await prisma.phaseInput.findMany({
    where: { projectId, phase },
    orderBy: { questionKey: "asc" },
    select: {
      questionKey: true,
      value: true,
      skipped: true,
      updatedAt: true,
    },
  });

  const state = recordsToState(
    phase,
    records
      .filter((record) => record.questionKey !== ONBOARDING_META_KEY)
      .map((record) => ({
        questionKey: record.questionKey,
        value: record.value,
        skipped: record.skipped,
      }))
  );

  const metaRecord = records.find(
    (record) => record.questionKey === ONBOARDING_META_KEY
  );
  if (metaRecord?.value && typeof metaRecord.value === "object") {
    const meta = metaRecord.value as { stepIndex?: number; complete?: boolean };
    state.onboarding = {
      stepIndex: typeof meta.stepIndex === "number" ? meta.stepIndex : 0,
      complete: Boolean(meta.complete),
    };
  }

  return state;
}
