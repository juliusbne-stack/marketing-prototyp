// Repair prompt — one corrective pass after server-side guard violations.
export const PHASE4_REPAIR_PROMPT = `AUFGABE: Korrigiere die übergebene Phase-4-Ausgabe anhand der maschinell erzeugten
Verstoßliste. Behalte gültige Schritte bei und behebe nur die genannten Verstöße.

REGELN:
- modus im Kontext ist bindend (VALIDATION oder SCALING).
- assumptionId nur aus whitelist.id verwenden.
- Keine doppelten assumptionId zwischen Schritten.
- strategyDimension und testSubject sind Pflicht pro Schritt.
- Jeder Messpunkt braucht signalCategory (COMMITMENT | BEHAVIOR | ATTENTION | QUALITATIVE).
- ATTENTION ist NIEMALS metricRole DECISIVE.
- Bei testSubject gelten die Signal-Passungsregeln aus dem Originalprompt.
- Bei SCALING: channel nur aus validatedChannels.
- diversityNote nur setzen, wenn der Server die Whitelist als eindimensional bestätigt hat.
- modeNote nur bei SCALING und ungültigem Kanalwunsch.

Antworte mit dem vollständig korrigierten JSON (criticalAssumptions, steps, optional diversityNote/modeNote).`;
