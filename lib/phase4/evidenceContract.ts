import type { SignalCategoryValue } from "@/lib/schemas/metric";
import type {
  EvidenceContract,
  ValidationClaimType,
  ValidationCore,
} from "./validationCoreTypes";

const INVALID_ENGAGEMENT = [
  "Impressionen",
  "Likes",
  "allgemeine Klicks",
  "allgemeine Kommentare",
  "Shares",
  "Reichweite (ohne Qualifikation)",
  "Engagement-Rate",
];

function contractForClaimType(
  claimType: ValidationClaimType
): EvidenceContract {
  switch (claimType) {
    case "PROBLEM_RELEVANCE":
    case "NEED":
      return {
        requiredEvidence: [
          "konkrete Bestätigung eines aktuellen Problems",
          "nachvollziehbare Beschreibung des Problemdrucks",
          "hohe Relevanzbewertung anhand definierter Kriterien",
          "gegebenenfalls konkrete Interessenshandlung",
        ],
        minimumStrength: "MEDIUM",
        acceptableDecisiveSignalTypes: ["QUALITATIVE", "BEHAVIOR"],
        acceptableSupportingSignalTypes: ["ATTENTION", "BEHAVIOR"],
        invalidAsSoleEvidence: INVALID_ENGAGEMENT,
        recommendedObservationUnit: "qualifizierte Teilnehmer der Bedarfsabfrage",
        qualificationRule:
          "Person gehört zur definierten Zielgruppe und beantwortet die Bedarfsabfrage vollständig.",
      };
    case "WILLINGNESS_TO_PAY":
      return {
        requiredEvidence: [
          "Kauf",
          "Anzahlung",
          "Vorbestellung",
          "verbindliche Preisentscheidung",
          "belastbare Zusage mit konkretem Preisanker",
        ],
        minimumStrength: "STRONG",
        acceptableDecisiveSignalTypes: ["COMMITMENT"],
        acceptableSupportingSignalTypes: ["BEHAVIOR"],
        invalidAsSoleEvidence: [
          ...INVALID_ENGAGEMENT,
          "Interesse",
          "kostenlose Registrierung",
        ],
        recommendedObservationUnit: "qualifizierte Kaufinteressenten",
        qualificationRule:
          "Person hat den Preis gesehen und trifft eine verbindliche Entscheidung.",
      };
    case "REACHABILITY":
    case "CHANNEL_FIT":
      return {
        requiredEvidence: [
          "qualifizierte Reichweite",
          "Antwortquote",
          "Kontaktquote",
          "erreichter Anteil der definierten Zielgruppe",
        ],
        minimumStrength: "MEDIUM",
        acceptableDecisiveSignalTypes: ["BEHAVIOR"],
        acceptableSupportingSignalTypes: ["ATTENTION", "QUALITATIVE"],
        invalidAsSoleEvidence: [],
        recommendedObservationUnit: "erreichte qualifizierte Personen",
        qualificationRule:
          "Person gehört zur definierten Zielgruppe und wurde über den getesteten Kanal erreicht.",
      };
    case "VALUE_PERCEPTION":
    case "PREFERENCE":
    case "SEGMENT_FIT":
    case "SEGMENT_MEMBERSHIP":
    case "PURCHASE_ROLE":
    case "ADOPTION_INTENT":
    case "USAGE_BEHAVIOR":
      return {
        requiredEvidence: [
          "erkennbare Präferenz oder Nutzenbewertung",
          "Auswahl zwischen Alternativen",
          "Nutzung eines Prototyps",
          "konkrete Nutzungsabsicht mit Handlung",
        ],
        minimumStrength: "MEDIUM",
        acceptableDecisiveSignalTypes: ["BEHAVIOR", "QUALITATIVE"],
        acceptableSupportingSignalTypes: ["ATTENTION", "COMMITMENT"],
        invalidAsSoleEvidence: INVALID_ENGAGEMENT,
        recommendedObservationUnit: "qualifizierte Testteilnehmer",
        qualificationRule:
          "Person gehört zur Zielgruppe und hat den Stimulus oder das Angebot wahrgenommen.",
      };
    default:
      return {
        requiredEvidence: ["direkte Beobachtung zur Annahme"],
        minimumStrength: "MEDIUM",
        acceptableDecisiveSignalTypes: [
          "COMMITMENT",
          "BEHAVIOR",
          "QUALITATIVE",
        ],
        acceptableSupportingSignalTypes: ["ATTENTION"],
        invalidAsSoleEvidence: ["ATTENTION als alleiniges Signal"],
        recommendedObservationUnit: "qualifizierte Beobachtungseinheiten",
        qualificationRule: "Person gehört zur relevanten Zielgruppe.",
      };
  }
}

export function buildEvidenceContract(
  core: ValidationCore
): EvidenceContract {
  return contractForClaimType(core.claimType);
}

export function isSignalAllowedAsDecisive(
  contract: EvidenceContract,
  signalCategory: SignalCategoryValue
): boolean {
  return contract.acceptableDecisiveSignalTypes.includes(signalCategory);
}
