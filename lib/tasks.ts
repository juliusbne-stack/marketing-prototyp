// Shared Prisma select for cockpit Task rows (API routes + server pages).
export const taskSelect = {
  id: true,
  stepId: true,
  title: true,
  hint: true,
  sortOrder: true,
  done: true,
  annahmenBezugId: true,
  erfolgskriterium: true,
  elaboration: true,
  elaborationGeneratedAt: true,
  elaborationModel: true,
} as const;
