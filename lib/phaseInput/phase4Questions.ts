import type { PhaseInputQuestion } from "./types";

export const P4_VALIDATION_METHODS = [
  { id: "interviews", label: "Interviews" },
  { id: "umfrage", label: "Online-Umfrage" },
  { id: "landingpage", label: "Landingpage / Warteliste" },
  { id: "anzeigen", label: "Bezahlte Test-Anzeigen" },
  { id: "social", label: "Social-Media-Post" },
  { id: "mvp", label: "Echtes Mini-Angebot / MVP" },
  { id: "vor_ort", label: "Vor-Ort-Test im Studio" },
] as const;

export const P4_ASSET_OPTIONS = [
  "Website",
  "Social-Media-Reichweite",
  "E-Mail-Liste",
  "Bestehende Kontakte/Kunden zur Zielgruppe",
  "Studio / Räume",
] as const;

export const P4_SKILL_OPTIONS = [
  "Kann Anzeigen schalten",
  "Kann Landingpage bauen",
  "Kann Content erstellen",
] as const;

export const PHASE4_QUESTIONS: PhaseInputQuestion[] = [
  {
    key: "p4_methoden",
    label: "Validierungsformen",
    question:
      "Welche Validierungsformen kommen für dich in Frage, welche schließt du aus?",
    skippable: true,
    inputType: "methodMatrix",
    methods: P4_VALIDATION_METHODS,
  },
  {
    key: "p4_budget_zeit",
    label: "Budget & Zeitrahmen",
    question:
      "Welches Budget und welchen Zeitrahmen willst du für die Validierung einsetzen?",
    hint: "Budget und Zeitraum kannst du einzeln überspringen.",
    skippable: true,
    inputType: "budgetZeit",
  },
  {
    key: "p4_assets",
    label: "Vorhandene Mittel",
    question: "Was ist bereits vorhanden, das du nutzen könntest?",
    skippable: true,
    inputType: "multiCheckbox",
    options: P4_ASSET_OPTIONS,
    sonstigesPlaceholder: "Sonstiges (z. B. Partnernetzwerk)",
  },
  {
    key: "p4_zielgruppen_zugang",
    label: "Zugang zur Zielgruppe",
    question:
      "Hast du bereits Zugang zu deiner Zielgruppe, oder muss der erst aufgebaut werden?",
    skippable: true,
    inputType: "choice",
    options: [
      "vorhanden",
      "teilweise",
      "muss erst aufgebaut werden",
    ] as const,
  },
  {
    key: "p4_kapazitaet",
    label: "Umsetzungskapazität",
    question: "Wer setzt um und mit welchen Fähigkeiten?",
    skippable: true,
    inputType: "kapazitaet",
    skillOptions: P4_SKILL_OPTIONS,
  },
  {
    key: "p4_oeffentlichkeit",
    label: "Öffentlichkeit der Tests",
    question:
      "Sind öffentliche Test-Kampagnen unter deiner Marke in Ordnung, oder lieber klein/verdeckt?",
    skippable: true,
    inputType: "choice",
    options: [
      "öffentlich unter Marke ok",
      "lieber klein/verdeckt",
    ] as const,
  },
];
