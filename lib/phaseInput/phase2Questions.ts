import type { PhaseInputQuestion } from "./types";

export const PHASE2_QUESTIONS: PhaseInputQuestion[] = [
  {
    key: "p2_ausschluss",
    label: "Ausschlüsse & Setzungen",
    question:
      "Gibt es Stoßrichtungen, Zielgruppen oder Geschäftsmodelle, die für dich von vornherein ausgeschlossen oder gesetzt sind?",
    hint: "z. B. kein B2B, nur Privatkunden, kein Marktplatz-Modell",
    placeholder: "Was schließt du aus oder was ist für dich fest gesetzt?",
    skippable: true,
    inputType: "textarea",
  },
  {
    key: "p2_kernangebot",
    label: "Kernangebot",
    question:
      "Wie fix ist dein Kernangebot? Ist das Hauptangebot gesetzt, oder sind angrenzende Modelle (Mitgliedschaft, Firmenkurse, Marktplatz) denkbar?",
    skippable: true,
    inputType: "kernangebot",
  },
  {
    key: "p2_eigene_option",
    label: "Eigene Stoßrichtung",
    question:
      "Gibt es eine strategische Stoßrichtung, die du selbst unbedingt als Option geprüft haben möchtest?",
    placeholder: "z. B. Kooperation mit lokalen Arbeitgebern",
    skippable: true,
    inputType: "textarea",
  },
];
