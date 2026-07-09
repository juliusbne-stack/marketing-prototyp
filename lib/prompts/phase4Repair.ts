// Repair prompt — one corrective pass after server-side guard violations.
import { METRIC_EFFECT_LOGIC_RULES } from "./validationCoreRules";

export const PHASE4_REPAIR_PROMPT = `AUFGABE: Korrigiere die übergebene Phase-4-Ausgabe anhand der maschinell erzeugten
Verstoßliste. Behalte gültige Schritte bei und behebe nur die genannten Verstöße.

REGELN:
- modus im Kontext ist bindend (VALIDATION oder SCALING).
- assumptionId nur aus whitelist.id verwenden.
- Keine doppelten assumptionId zwischen Schritten.
- strategyDimension und testSubject sind Pflicht pro Schritt.
- Jeder Messpunkt braucht signalCategory (COMMITMENT | BEHAVIOR | ATTENTION | QUALITATIVE).
- ATTENTION ist NIEMALS metricRole DECISIVE.
- ${METRIC_EFFECT_LOGIC_RULES}
- Bei testSubject gelten die Signal-Passungsregeln aus dem Originalprompt.
- V7 (testSubject-Mismatch): Für jede Annahme liefert whitelist.allowedDecisiveTestSubjects
  den erlaubten DECISIVE-Satz. Wähle testSubject für entscheidende Metriken NUR aus diesem Satz.
  v7RepairHints im Kontext sind bindend. REACHABILITY höchstens als SUPPORTING, wenn die Annahme
  keine explizite Erreichbarkeits-Unsicherheit prüft (allowedDecisiveTestSubjects ohne REACHABILITY).
- Bei SCALING: channel nur aus validatedChannels.
- diversityNote nur setzen, wenn der Server die Whitelist als eindimensional bestätigt hat.
- modeNote nur bei SCALING und ungültigem Kanalwunsch.

Antworte mit dem vollständig korrigierten JSON (criticalAssumptions, steps, optional diversityNote/modeNote).`;
