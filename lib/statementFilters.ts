/** Prisma-WHERE-Fragment: nur übernommene, nicht abgelöste Aussagen.
 *  Additiv spreaden — bestehende Bedingungen (phase, category, …) nicht ersetzen. */
export const ACTIVE_ADOPTED_WHERE = {
  adopted: true,
  supersededByStatementId: null,
} as const;

/** In-Memory-Prädikat, äquivalent zu ACTIVE_ADOPTED_WHERE.
 *  Nur gültig, wenn das Statement-Objekt supersededByStatementId geladen hat (siehe 4b). */
export function isActiveAdopted(
  s: { adopted: boolean; supersededByStatementId: string | null }
): boolean {
  return s.adopted && s.supersededByStatementId === null;
}
