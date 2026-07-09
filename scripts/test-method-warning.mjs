import assert from "node:assert/strict";
import { resolveMethodWarningAfterFrameEdit, resolveMethodWarningForDisplay } from "../lib/phase4/methodWarning.ts";

const zeitNote =
  "Zeitrahmen nicht angegeben (deine Angabe) — Schritte konservativ dimensioniert.";
const budgetNote =
  "Budget nicht angegeben (deine Angabe) — Schritte konservativ dimensioniert.";
const combinedNote =
  "Budget und Zeitrahmen nicht angegeben (deine Angabe) — Schritte konservativ dimensioniert.";
const zugangNote =
  "Zielgruppen-Zugang nur teilweise vorhanden (deine Angabe).";
const aufbauNote =
  "Zielgruppen-Zugang muss erst aufgebaut werden (deine Angabe) — kein direkter Kontakt vorausgesetzt.";

assert.equal(
  resolveMethodWarningAfterFrameEdit(
    `${zeitNote} ${zugangNote}`,
    { timeframe: "3 Wochen" }
  ),
  zugangNote
);

assert.equal(
  resolveMethodWarningAfterFrameEdit(combinedNote, { timeframe: "2 Wochen" }),
  budgetNote
);

assert.equal(
  resolveMethodWarningAfterFrameEdit(combinedNote, {
    timeframe: "2 Wochen",
    budgetFrame: "500 €",
  }),
  null
);

assert.equal(
  resolveMethodWarningAfterFrameEdit(zeitNote, { timeframe: null }),
  zeitNote
);

assert.equal(
  resolveMethodWarningForDisplay(`${zeitNote} ${zugangNote}`, {
    timeframe: "2–3 Wochen",
    budgetFrame: "500 €",
    title: "Reichweitentest über LinkedIn-Anzeigen",
    description: "LinkedIn Ads schalten",
    testDesign: "Bezahlte Anzeigen",
    marketingActivities: ["Anzeigen erstellen"],
  }),
  null
);

assert.equal(
  resolveMethodWarningForDisplay(zugangNote, {
    timeframe: null,
    budgetFrame: null,
    title: "Interview mit Bestandskunden",
    description: "Direkte Kontaktaufnahme über Kundenliste",
    testDesign: null,
    marketingActivities: [],
  }),
  null
);

assert.equal(
  resolveMethodWarningForDisplay(aufbauNote, {
    timeframe: null,
    budgetFrame: null,
    title: "Interview mit Bestandskunden",
    description: "Direkte Kontaktaufnahme über Kundenliste",
    testDesign: null,
    marketingActivities: [],
  }),
  aufbauNote
);

console.log("OK: methodWarning frame edit tests passed");
