import { notFound } from "next/navigation";
import { ValidationStepDetailView } from "@/components/phase4/ValidationStepDetailView";
import { loadValidationStepDetail } from "@/lib/validationStepDetail";

export default async function ValidationStepDetailPage({
  params,
}: {
  params: Promise<{ id: string; stepId: string }>;
}) {
  const { id, stepId } = await params;
  const data = await loadValidationStepDetail(id, stepId);

  if (!data) {
    notFound();
  }

  return <ValidationStepDetailView data={data} />;
}
