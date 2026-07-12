// Repair prompt — one corrective pass after server-side guard violations.
import { METRIC_EFFECT_LOGIC_RULES } from "./validationCoreRules";

export const PHASE4_REPAIR_PROMPT = `AUFGABE: Korrigiere die übergebene Phase-4-Ausgabe anhand der maschinell erzeugten
Verstoßliste. Behalte gültige Schritte bei und behebe nur die genannten Verstöße.

REGELN:
- modus im Kontext ist bindend (VALIDATION oder SCALING).
- nutzerbedingungen und annahmenPlanung (validationCore, evidenceContract, ausgewaehlterTestansatz) sind bindend.
- consistencyRepairHints sind bindend — behebe jeden genannten CODE.
- assumptionId nur aus whitelist.id verwenden.
- Keine doppelten assumptionId zwischen Schritten.
- strategyDimension und testSubject sind Pflicht pro Schritt.
- testSubject MUSS primaryTestSubject aus annahmenPlanung entsprechen, sofern vorhanden.
- Jeder Messpunkt braucht signalCategory (COMMITMENT | BEHAVIOR | ATTENTION | QUALITATIVE).
- ATTENTION ist NIEMALS metricRole DECISIVE, außer der Aussagekern ist selbst Erreichbarkeit.
- ${METRIC_EFFECT_LOGIC_RULES}
- Bei testSubject gelten die Signal-Passungsregeln aus dem Originalprompt.
- V7 (testSubject-Mismatch): Für jede Annahme liefert whitelist.allowedDecisiveTestSubjects
  den erlaubten DECISIVE-Satz. Wähle testSubject für entscheidende Metriken NUR aus diesem Satz.
- Keine indirekten Proxy-Signale (Likes, Shares, Reichweite) als alleinige DECISIVE-Metrik für Bedarf, Problemrelevanz oder Zahlungsbereitschaft.
- Fehlende eigene Social-Reichweite: externen Verbreitungsweg nennen — Social Media nicht als ausgeschlossen behandeln.
- Keine interne Prozesssprache im testDesign oder in Aktivitäten.
- Bei SCALING: channel nur aus validatedChannels.
- V9 (fremde Plattform): v9RepairHints sind bindend. Ersetze den betroffenen Schritt vollständig
  mit einem Kanal aus verfuegbareKanaele — inkl. Testdesign, Aktivitäten und Metriken. Keine stille channel-Korrektur.
- diversityNote nur setzen, wenn der Server die Whitelist als eindimensional bestätigt hat.
- modeNote nur bei SCALING und ungültigem Kanalwunsch.

Antworte mit dem vollständig korrigierten JSON (criticalAssumptions, steps, optional diversityNote/modeNote).`;
