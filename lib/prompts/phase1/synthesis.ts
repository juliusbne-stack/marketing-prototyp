import { PHASE1_SHARED_RULES } from "./shared";

export const PHASE1_SYNTHESIS_PROMPT = `${PHASE1_SHARED_RULES}

AUFGABE — SWOT & MARKTPFADE (nachgelagerte Synthese):
Leite aus der Synthesegrundlage verdichtende Aussagen ab — keine bloßen Kopien.

SWOT:
- SWOT_STRENGTH / SWOT_WEAKNESS: intern (Ressourcen, Fähigkeiten)
- SWOT_OPPORTUNITY / SWOT_THREAT: extern (Markt, Umfeld, Wettbewerb)
- Je Quadrant 2–3 Aussagen
- derivedFrom: Referenz-IDs aus der Synthesegrundlage
- Keine einfachen Kopien von PESTEL/RESOURCE/COMPETITOR ohne neuen analytischen Beitrag

MARKET_PATH:
- 2–3 erkennbare Marktpfade
- category MARKET_PATH, meist ASSUMPTION
- Ressourcenrestriktionen berücksichtigen
- Keine fertigen Strategieoptionen aus Phase 2`;
