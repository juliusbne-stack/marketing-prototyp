import { describe, expect, it } from "vitest";
import { buildTopCandidates } from "./candidates";
import { normalizePhase4Constraints } from "./constraints";
import {
  checkValidationStepConsistency,
  mentionsSocialInStep,
} from "./consistencyCheck";
import {
  detectCompoundClaims,
  deriveValidationCore,
} from "./validationCore";
import { claimTypeToTestSubject } from "./validationCoreTypes";
import {
  derivePrimaryTestSubject,
  deriveAllowedDecisiveTestSubjects,
} from "./testSubjectDerivation";
import { buildEvidenceContract } from "./evidenceContract";
import {
  hasDirectDecisiveMetric,
  isIndirectProxyMetric,
} from "./metricHelpers";
import { buildPhase4Planning } from "./pipeline";
import {
  applyProxyStrengthCorrections,
  validateSteps,
  type GuardContext,
} from "./guards";
import {
  buildForeignPlatformMethodWarning,
  deriveAvailableChannels,
  findForeignPlatformsInChannel,
} from "./availableChannels";
import {
  phase4ScaleResponseSchema,
  type Phase4LlmResponse,
  type Phase4StepOutput,
} from "@/lib/schemas/phase4";
import type { PhaseInputState } from "@/lib/phaseInput/types";
import type { AssumptionPlanning } from "./validationCoreTypes";

function demoAssumption() {
  return {
    id: "demo-1",
    content:
      "Diese Option adressiert das Segment ‚Frühphasige Start-ups und Solo-Founder‘ mit dem Fokus auf deren Bedarf nach einer systematischen Methode zur Entwicklung von Marketingstrategien.",
    justification:
      "Das Segment hat Schwierigkeiten mit unstrukturierten Marketingansätzen und sucht nach einer strukturierten Vorgehensweise.",
    uncertainty: null,
    strategyDimension: "TARGET_GROUP" as const,
    category: "OPT_TARGET_GROUP",
  };
}

function phase4State(
  overrides: Partial<PhaseInputState["answers"]> = {}
): PhaseInputState {
  return {
    onboarding: { stepIndex: 0, complete: true },
    answers: {
      p4_methoden: {
        skipped: false,
        value: {
          interviews: "nein",
          umfrage: "ja",
          landingpage: "egal",
          anzeigen: "nein",
          social: "ja",
          mvp: "egal",
          vor_ort: "nein",
        },
      },
      p4_assets: {
        skipped: false,
        value: { selected: ["Website"] },
      },
      p4_budget_zeit: {
        skipped: false,
        value: {
          budgetEur: 200,
          budgetSkipped: false,
          weeks: 3,
          weeksSkipped: false,
        },
      },
      p4_zielgruppen_zugang: {
        skipped: false,
        value: "muss erst aufgebaut werden",
      },
      ...overrides,
    },
  };
}

function baseStep(
  partial: Partial<Phase4StepOutput> = {}
): Phase4StepOutput & { methodWarning?: string | null } {
  return {
    assumptionId: "demo-1",
    strategyDimension: "TARGET_GROUP",
    testSubject: "PROBLEM_RELEVANCE",
    validationQuestion:
      "Erleben frühphasige Start-ups und Solo-Founder die Entwicklung einer Marketingstrategie als relevantes Problem und zeigen sie konkretes Interesse an systematischer Unterstützung?",
    testDesign:
      "Ein kurzer Problembeitrag mit Link zu einer kompakten Bedarfsabfrage wird gezielt in geeigneten Gründer-Communities verteilt. Da keine bestehenden Follower vorhanden sind, wird der Test nicht von einer eigenen Reichweite abhängig gemacht.",
    title: "Gezielter Bedarfstest in Gründer-Communities",
    description: "Bedarfsabfrage über Communities und Direktansprache.",
    marketingActivities: [
      "Problemhypothese formulieren",
      "Kurzen Stimulus erstellen",
      "Bedarfsabfrage vorbereiten",
      "Gründer-Communities auswählen",
      "Beitrag gezielt verbreiten",
      "Qualifizierte Antworten dokumentieren",
    ],
    channel: "Gründer-Communities",
    timeframe: "3 Wochen",
    budgetFrame: "unter 200 EUR",
    metrics: [
      {
        name: "Qualifizierte Problem-Bestätigungen mit Interessenshandlung",
        evaluationMode: "CUMULATIVE",
        metricRole: "DECISIVE",
        signalCategory: "QUALITATIVE",
        proxyStrength: "DIRECT",
        signalRationale: "Misst direkt Problemdruck und Interesse.",
        successCriterion:
          "gilt als stützend, wenn mindestens 6 von 10 qualifizierten Personen hohen Problemdruck bestätigen und mindestens 3 weitere Informationen anfordern",
        failureCriterion:
          "gilt als widerlegend, wenn bei mindestens 10 Teilnahmen höchstens 2 hohen Problemdruck bestätigen und niemand weitere Informationen anfordert",
      },
      {
        name: "Inhaltliche Kommentare",
        evaluationMode: "CUMULATIVE",
        metricRole: "SUPPORTING",
        signalCategory: "QUALITATIVE",
        successCriterion: "stützend wenn relevante Kommentare vorliegen",
        failureCriterion: "widerlegend wenn keine inhaltlichen Rückmeldungen",
      },
    ],
    ...partial,
  };
}

function planningForDemo(): AssumptionPlanning {
  const assumption = demoAssumption();
  const constraints = normalizePhase4Constraints(phase4State());
  const validationCore = deriveValidationCore(assumption);
  const evidenceContract = buildEvidenceContract(validationCore);
  const { all, filtered, selected } = buildTopCandidates(
    validationCore,
    constraints
  );
  return {
    assumptionId: assumption.id,
    validationCore,
    evidenceContract,
    constraints,
    primaryTestSubject: derivePrimaryTestSubject(assumption, validationCore),
    allowedTestSubjects: deriveAllowedDecisiveTestSubjects(
      assumption,
      validationCore
    ),
    candidates: filtered.length > 0 ? filtered : all,
    selectedCandidate: selected,
  };
}

describe("Phase 4 ValidationCore — Demofall", () => {
  it("leitet Problemrelevanz/Bedarf ab, nicht Erreichbarkeit", () => {
    const core = deriveValidationCore(demoAssumption());
    expect(["NEED", "PROBLEM_RELEVANCE"]).toContain(core.claimType);
    expect(claimTypeToTestSubject(core.claimType)).toBe("PROBLEM_RELEVANCE");
    expect(core.targetGroup.toLowerCase()).toContain("start");
  });

  it("wählt Community-Bedarfstest statt organischen Eigenprofil-Post", () => {
    const planning = planningForDemo();
    expect(planning.selectedCandidate.methodType).not.toBe("social_owned");
    expect(planning.selectedCandidate.title.toLowerCase()).toMatch(
      /communities|direkt/
    );
    expect(planning.selectedCandidate.requiresOwnedReach).toBe(false);
  });
});

describe("TEST 1: Bedarf und keine eigene Social-Media-Reichweite", () => {
  it("Social Media erlaubt, externer Verbreitungsweg erforderlich bei fehlendem Pfad", () => {
    const constraints = normalizePhase4Constraints(phase4State());
    expect(constraints.socialMediaPosting).not.toBe("EXCLUDED");
    expect(constraints.ownedSocialReach).toBe("LIMITED");

    const stepWithoutPath = baseStep({
      title: "LinkedIn-Post Test",
      description: "Post auf eigenem Profil ohne externe Verteilung.",
      channel: "Eigenes Profil",
      testDesign: "LinkedIn-Post auf eigenem Profil.",
      marketingActivities: ["Post veröffentlichen"],
    });
    const issues = checkValidationStepConsistency(
      stepWithoutPath,
      planningForDemo(),
      constraints
    );
    expect(
      issues.some((i) => i.code === "PHASE4_SOCIAL_WITHOUT_DISTRIBUTION_PATH")
    ).toBe(true);
  });

  it("kein Warnfehler wenn externer Verbreitungsweg vorhanden", () => {
    const step = baseStep();
    const constraints = normalizePhase4Constraints(phase4State());
    const issues = checkValidationStepConsistency(
      step,
      planningForDemo(),
      constraints
    );
    expect(
      issues.some((i) => i.code === "PHASE4_SOCIAL_WITHOUT_DISTRIBUTION_PATH")
    ).toBe(false);
    expect(
      issues.some((i) => i.code === "PHASE4_FALSE_EXCLUSION_CLAIM")
    ).toBe(false);
  });

  it("Mikro-Influencer gilt als externer Verbreitungsweg (Multiplikator)", () => {
    const constraints = normalizePhase4Constraints(phase4State());
    const step = baseStep({
      title: "Vergleichstest mit Mikro-Influencern",
      channel: "Instagram",
      testDesign: "Influencer-Posts auf Instagram zur Präferenzmessung",
      marketingActivities: ["Content erstellen", "Posten"],
    });
    const issues = checkValidationStepConsistency(
      step,
      planningForDemo(),
      constraints
    );
    expect(
      issues.some((i) => i.code === "PHASE4_SOCIAL_WITHOUT_DISTRIBUTION_PATH")
    ).toBe(false);
  });

  it("Anzeigen ohne bezahlt-Prefix gelten als Verbreitungsweg", () => {
    const constraints = normalizePhase4Constraints(phase4State());
    const step = baseStep({
      channel: "Instagram",
      testDesign: "Instagram-Anzeigen mit Zielgruppen-Targeting",
      marketingActivities: ["Anzeigen schalten"],
    });
    const issues = checkValidationStepConsistency(
      step,
      planningForDemo(),
      constraints
    );
    expect(
      issues.some((i) => i.code === "PHASE4_SOCIAL_WITHOUT_DISTRIBUTION_PATH")
    ).toBe(false);
  });

  it("Social-Schritt ohne Verbreitungsweg scheitert weiterhin an C1", () => {
    const constraints = normalizePhase4Constraints(phase4State());
    const step = baseStep({
      title: "Organischer Instagram-Post",
      description: "Post auf dem eigenen Profil ohne externe Verteilung.",
      channel: "Instagram",
      testDesign: "Kurzer Post auf dem eigenen Profil ohne externe Verteilung.",
      marketingActivities: ["Post veröffentlichen"],
    });
    const issues = checkValidationStepConsistency(
      step,
      planningForDemo(),
      constraints
    );
    expect(
      issues.some((i) => i.code === "PHASE4_SOCIAL_WITHOUT_DISTRIBUTION_PATH")
    ).toBe(true);
  });
});

describe("TEST 2: Social Media ausdrücklich ausgeschlossen", () => {
  it("filtert Social-Kandidaten", () => {
    const state = phase4State({
      p4_methoden: {
        skipped: false,
        value: {
          interviews: "nein",
          umfrage: "ja",
          landingpage: "egal",
          anzeigen: "nein",
          social: "nein",
          mvp: "egal",
          vor_ort: "nein",
        },
      },
    });
    const constraints = normalizePhase4Constraints(state);
    expect(constraints.socialMediaPosting).toBe("EXCLUDED");

    const core = deriveValidationCore(demoAssumption());
    const { filtered } = buildTopCandidates(core, constraints);
    expect(filtered.every((c) => !c.requiredMethods.includes("social"))).toBe(
      true
    );
  });
});

describe("TEST 3: Eigene Reichweite vorhanden", () => {
  it("organischer Beitrag kann Kandidat sein, Metrik muss zum Kern passen", () => {
    const state = phase4State({
      p4_assets: {
        skipped: false,
        value: { selected: ["Website", "Social-Media-Reichweite"] },
      },
    });
    const constraints = normalizePhase4Constraints(state);
    expect(constraints.ownedSocialReach).toBe("AVAILABLE");

    const core = deriveValidationCore(demoAssumption());
    const { all } = buildTopCandidates(core, constraints);
    expect(all.some((c) => c.methodType === "social_owned")).toBe(true);
  });
});

describe("TEST 4: Erreichbarkeitsannahme", () => {
  it("klassifiziert REACHABILITY und erlaubt qualifizierte Reichweite", () => {
    const assumption = {
      id: "reach-1",
      content:
        "Frühphasige Start-ups können über LinkedIn-Gruppen effizient erreicht werden.",
      justification: "Der Kanal wird genutzt.",
      uncertainty:
        "Es ist unklar, ob die Reichweite über LinkedIn-Gruppen ausreicht.",
      strategyDimension: "MARKET_ACCESS" as const,
      category: "OPT_MARKET_ACCESS",
    };
    const core = deriveValidationCore(assumption);
    expect(core.claimType).toMatch(/REACHABILITY|CHANNEL_FIT/);
    expect(derivePrimaryTestSubject(assumption, core)).toBe("REACHABILITY");
  });
});

describe("TEST 5: Zahlungsbereitschaft", () => {
  it("erfordert COMMITMENT, nicht Engagement", () => {
    const assumption = {
      id: "wtp-1",
      content: "Solo-Founder sind bereit, 29 Euro pro Monat zu zahlen.",
      justification: null,
      uncertainty: null,
      strategyDimension: "REVENUE_GROWTH" as const,
      category: "OPT_REVENUE",
    };
    const core = deriveValidationCore(assumption);
    expect(core.claimType).toBe("WILLINGNESS_TO_PAY");
    const contract = buildEvidenceContract(core);
    expect(contract.acceptableDecisiveSignalTypes).toEqual(["COMMITMENT"]);

    const proxyOnly = [
      {
        name: "Likes",
        successCriterion: "viele Likes",
        failureCriterion: "wenige Likes",
        metricRole: "DECISIVE",
        signalCategory: "ATTENTION" as const,
      },
    ];
    expect(
      hasDirectDecisiveMetric(proxyOnly, "WILLINGNESS_TO_PAY")
    ).toBe(false);
  });
});

describe("TEST 6: Nutzenversprechen", () => {
  it("erkennt Wertwahrnehmung, keine Reichweitenmetrik", () => {
    const assumption = {
      id: "value-1",
      content:
        "Die geführte Schritt-für-Schritt-Unterstützung wird gegenüber freien KI-Chats als hilfreicher wahrgenommen.",
      justification: null,
      uncertainty: null,
      strategyDimension: "VALUE_PROPOSITION" as const,
      category: "OPT_VALUE_PROPOSITION",
    };
    const core = deriveValidationCore(assumption);
    expect(["VALUE_PERCEPTION", "ADOPTION_INTENT"]).toContain(core.claimType);
    expect(derivePrimaryTestSubject(assumption, core)).toBe(
      "VALUE_UNDERSTANDING"
    );
  });
});

describe("TEST 7: Zusammengesetzte Annahme", () => {
  it("erkennt PHASE4_MULTIPLE_CLAIMS_IN_SINGLE_STEP", () => {
    const issue = detectCompoundClaims({
      id: "compound",
      content:
        "Die Zielgruppe hat Bedarf und ist über LinkedIn gut erreichbar.",
      justification: null,
      uncertainty: null,
      strategyDimension: "TARGET_GROUP",
      category: "OPT_TARGET_GROUP",
    });
    expect(issue?.code).toBe("PHASE4_MULTIPLE_CLAIMS_IN_SINGLE_STEP");
  });
});

describe("TEST 8: Nur indirekte entscheidende Signale", () => {
  it("erkennt PHASE4_ONLY_INDIRECT_DECISIVE_SIGNAL", () => {
    const step = baseStep({
      metrics: [
        {
          name: "Signifikante Interaktionen",
          evaluationMode: "PER_POINT",
          metricRole: "DECISIVE",
          signalCategory: "ATTENTION",
          successCriterion: "15 Prozent Engagement",
          failureCriterion: "unter 5 Prozent",
        },
      ],
    });
    const issues = checkValidationStepConsistency(
      step,
      planningForDemo(),
      normalizePhase4Constraints(phase4State())
    );
    expect(
      issues.some((i) => i.code === "PHASE4_ONLY_INDIRECT_DECISIVE_SIGNAL")
    ).toBe(true);
    expect(isIndirectProxyMetric(step.metrics[0]!)).toBe(true);
  });
});

describe("TEST 9: Interne Prozesssprache", () => {
  it("erkennt PHASE4_INTERNAL_PROCESS_LANGUAGE", () => {
    const step = baseStep({
      testDesign:
        "Die zuvor naheliegende Methode wurde ersetzt.",
    });
    const issues = checkValidationStepConsistency(
      step,
      planningForDemo(),
      normalizePhase4Constraints(phase4State())
    );
    expect(
      issues.some((i) => i.code === "PHASE4_INTERNAL_PROCESS_LANGUAGE")
    ).toBe(true);
  });
});

describe("TEST 10: Refinement-Kern bleibt erhalten", () => {
  it("direkter Bedarfstest mit externer Verbreitung und direkter Metrik ist konsistent", () => {
    const step = baseStep();
    const issues = checkValidationStepConsistency(
      step,
      planningForDemo(),
      normalizePhase4Constraints(phase4State())
    );
    const errors = issues.filter((i) => i.severity === "ERROR");
    expect(errors.some((i) => i.code === "PHASE4_ONLY_INDIRECT_DECISIVE_SIGNAL")).toBe(false);
    expect(step.metrics.some((m) => m.metricRole === "DECISIVE")).toBe(true);
    expect(step.testDesign.toLowerCase()).toMatch(/community|gründer/);
  });
});

describe("TEST 11: Keine Angabe zur Reichweite", () => {
  it("behauptet weder Reichweite vorhanden noch Social ausgeschlossen", () => {
    const state: PhaseInputState = {
      onboarding: { stepIndex: 0, complete: true },
      answers: {
        p4_methoden: {
          skipped: true,
          value: null,
        },
      },
    };
    const constraints = normalizePhase4Constraints(state);
    expect(constraints.ownedSocialReach).toBe("UNKNOWN");
    expect(constraints.socialMediaPosting).not.toBe("EXCLUDED");
  });
});

describe("TEST 12: Zu kleine Stichprobe", () => {
  it("erlaubt uneindeutigen Bereich in Kriterien", () => {
    const metric = baseStep().metrics[0]!;
    const blob = `${metric.successCriterion} ${metric.failureCriterion}`;
    expect(blob.toLowerCase()).toMatch(/qualifiziert|mindestens/);
    expect(metric.failureCriterion.toLowerCase()).not.toMatch(
      /kein signal.*widerlegt/
    );
  });
});

describe("Constraint-Normalisierung", () => {
  it("unterscheidet LIMITED Reichweite von EXCLUDED Social", () => {
    const constraints = normalizePhase4Constraints(phase4State());
    expect(constraints.ownedSocialReach).toBe("LIMITED");
    expect(constraints.socialMediaPosting).toBe("AVAILABLE");
  });
});

describe("Pipeline", () => {
  it("erzeugt Planung pro Whitelist-Eintrag", () => {
    const bundle = buildPhase4Planning(
      [
        {
          id: demoAssumption().id,
          content: demoAssumption().content,
          justification: demoAssumption().justification,
          uncertainty: demoAssumption().uncertainty,
          evidenceStatus: "ASSUMPTION",
          strategyDimension: "TARGET_GROUP",
          category: "OPT_TARGET_GROUP",
          allowedDecisiveTestSubjects: ["PROBLEM_RELEVANCE"],
        },
      ],
      phase4State()
    );
    expect(bundle.perAssumption.size).toBe(1);
    const planning = bundle.perAssumption.get("demo-1");
    expect(planning?.primaryTestSubject).toBe("PROBLEM_RELEVANCE");
  });
});

describe("Skalierungsantworten", () => {
  it("erlaubt einen einzelnen Skalierungsschritt, wenn nur eine gestützte Kernannahme vorliegt", () => {
    const parsed = phase4ScaleResponseSchema.safeParse({
      criticalAssumptions: ["demo-1"],
      diversityNote: null,
      modeNote: null,
      steps: [baseStep()],
    });

    expect(parsed.success).toBe(true);
  });
});

describe("Social-Erkennung", () => {
  it("erkennt Social-Media-Bezug im Schritt", () => {
    expect(mentionsSocialInStep(baseStep())).toBe(false);
    expect(
      mentionsSocialInStep(
        baseStep({ channel: "LinkedIn", testDesign: "Post in LinkedIn-Gruppe" })
      )
    ).toBe(true);
  });
});

function minimalResponse(steps: Phase4StepOutput[]): Phase4LlmResponse {
  return {
    criticalAssumptions: steps.map((step) => step.assumptionId),
    diversityNote: null,
    modeNote: null,
    steps,
  };
}

describe("proxyStrength serverseitige Korrektur", () => {
  it("stufe Präferenz/Nutzenbewertung von DIRECT auf PROXY herunter", () => {
    const step = baseStep({
      testSubject: "VALUE_UNDERSTANDING",
      metrics: [
        {
          name: "Präferenz und Nutzenbewertung der Testteilnehmer",
          evaluationMode: "PER_POINT",
          metricRole: "DECISIVE",
          signalCategory: "BEHAVIOR",
          proxyStrength: "DIRECT",
          signalRationale: "Präferenzrückmeldungen",
          successCriterion:
            "gilt als stützend, wenn mindestens 50 % positive Präferenz abgeben",
          failureCriterion:
            "gilt als widerlegend, wenn weniger als 20 % positive Präferenz abgeben",
        },
      ],
    });
    const corrected = applyProxyStrengthCorrections(minimalResponse([step]));
    expect(corrected.steps[0]!.metrics[0]!.proxyStrength).toBe("PROXY");
  });

  it("lässt echte Direktbelege als DIRECT (COMMITMENT / qualifizierte Problembestätigung)", () => {
    const directNeedStep = baseStep();
    const correctedNeed = applyProxyStrengthCorrections(
      minimalResponse([directNeedStep])
    );
    expect(correctedNeed.steps[0]!.metrics[0]!.proxyStrength).toBe("DIRECT");

    const paymentStep = baseStep({
      testSubject: "WILLINGNESS_TO_PAY",
      metrics: [
        {
          name: "Vorbestellungen nach Preisansicht",
          evaluationMode: "CUMULATIVE",
          metricRole: "DECISIVE",
          signalCategory: "COMMITMENT",
          proxyStrength: "DIRECT",
          signalRationale: "Misst verbindliche Kaufzusage nach sichtbarem Preis",
          successCriterion: "gilt als stützend, wenn mindestens 3 Vorbestellungen eingehen",
          failureCriterion: "gilt als widerlegend, wenn keine Vorbestellung eingeht",
        },
      ],
    });
    const correctedPayment = applyProxyStrengthCorrections(
      minimalResponse([paymentStep])
    );
    expect(correctedPayment.steps[0]!.metrics[0]!.proxyStrength).toBe("DIRECT");
  });

  it("prüft SUPPORTING-Metriken nicht", () => {
    const step = baseStep({
      metrics: [
        baseStep().metrics[0]!,
        {
          name: "Präferenz als Nebensignal",
          evaluationMode: "PER_POINT",
          metricRole: "SUPPORTING",
          signalCategory: "BEHAVIOR",
          proxyStrength: "DIRECT",
          successCriterion: "stützend wenn positiv",
          failureCriterion: "widerlegend wenn negativ",
        },
      ],
    });
    const corrected = applyProxyStrengthCorrections(minimalResponse([step]));
    const supporting = corrected.steps[0]!.metrics.find(
      (m) => m.metricRole === "SUPPORTING"
    );
    expect(supporting?.proxyStrength).toBe("DIRECT");
  });
});

describe("verfuegbareKanaele und Kanal-Soft-Warnung", () => {
  const vintagePhaseInput: PhaseInputState = {
    onboarding: { stepIndex: 5, complete: true },
    answers: {
      p4_methoden: {
        skipped: false,
        value: {
          mvp: "egal",
          social: "ja",
          umfrage: "nein",
          vor_ort: "nein",
          anzeigen: "ja",
          interviews: "nein",
          landingpage: "nein",
        },
      },
      p4_assets: {
        skipped: false,
        value: { selected: [], sonstiges: "Den bestehenden Online Store" },
      },
      p4_kapazitaet: {
        skipped: false,
        value: {
          team: "allein",
          skills: [
            "Kann Anzeigen schalten",
            "Kann Landingpage bauen",
            "Kann Content erstellen",
          ],
        },
      },
    },
  };

  it("leitet Vintage-Venture-Kanaele ohne LinkedIn ab", () => {
    const derived = deriveAvailableChannels({
      skills:
        "Ich kenne mich gut mit Shopify aus. Ich kann Werbeanzeigen auf Instagram und Google schalten.",
      businessIdea:
        "Ich verkaufe gebrauchte Vintage Kleidung auf Vinted und über meinen eigenen Online-Store.",
      phaseInputState: vintagePhaseInput,
      option: {
        title: "Vintage über Social und Vinted",
        summary: "Mikro-Influencer auf Instagram",
        prioritizationRationale: null,
        statementTexts: [],
      },
    });

    expect(derived.kanaele).toEqual(
      expect.arrayContaining(["Instagram", "TikTok", "Google Ads", "Vinted"])
    );
    expect(derived.platformKeys).not.toContain("linkedin");
    expect(findForeignPlatformsInChannel("LinkedIn-Gruppen", derived.platformKeys)).toEqual([
      "LinkedIn",
    ]);
  });

  it("erlaubt LinkedIn ohne Warnung bei B2B-Profil", () => {
    const derived = deriveAvailableChannels({
      skills: "LinkedIn-Outreach, Content-Marketing auf LinkedIn",
      businessIdea: "B2B SaaS für HR-Teams",
      phaseInputState: null,
      option: {
        title: "LinkedIn-first GTM",
        summary: null,
        prioritizationRationale: null,
        statementTexts: [],
      },
    });

    expect(derived.platformKeys).toContain("linkedin");
    expect(findForeignPlatformsInChannel("LinkedIn-Gruppen", derived.platformKeys)).toEqual([]);
  });

  it("formuliert Soft-Warnung für fremde Plattform", () => {
    const warning = buildForeignPlatformMethodWarning(["LinkedIn"]);
    expect(warning).toMatch(/LinkedIn/);
    expect(warning).toMatch(/übernehmbar/i);
  });
});

describe("V9 fremde Plattform im channel", () => {
  const vintageCtx: GuardContext = {
    mode: "VALIDATION",
    whitelist: [
      {
        id: "a1",
        content: "Test",
        justification: null,
        uncertainty: null,
        evidenceStatus: "ASSUMPTION",
        strategyDimension: "MARKET_ACCESS",
        category: "OPT_MARKET_ACCESS",
        allowedDecisiveTestSubjects: ["REACHABILITY"],
      },
      {
        id: "a2",
        content: "Test2",
        justification: null,
        uncertainty: null,
        evidenceStatus: "ASSUMPTION",
        strategyDimension: "TARGET_GROUP",
        category: "OPT_TARGET_GROUP",
        allowedDecisiveTestSubjects: ["VALUE_UNDERSTANDING"],
      },
    ],
    validatedChannels: [],
    whitelistDimensionState: "MULTI",
    availablePlatformKeys: ["instagram", "tiktok"],
  };

  it("löst V9 bei LinkedIn ohne instagram/tiktok in platformKeys aus", () => {
    const violations = validateSteps(
      {
        criticalAssumptions: ["a1", "a2"],
        diversityNote: null,
        modeNote: null,
        steps: [
          {
            ...baseStep(),
            assumptionId: "a1",
            strategyDimension: "MARKET_ACCESS",
            testSubject: "REACHABILITY",
            channel: "LinkedIn-Gruppen",
            metrics: baseStep().metrics,
          },
          {
            ...baseStep(),
            assumptionId: "a2",
            strategyDimension: "TARGET_GROUP",
            testSubject: "VALUE_UNDERSTANDING",
            channel: "Instagram",
            metrics: baseStep().metrics,
          },
        ],
      },
      vintageCtx
    );

    expect(violations.some((v) => v.rule === "V9" && v.stepIndex === 0)).toBe(
      true
    );
    expect(violations.some((v) => v.rule === "V9" && v.stepIndex === 1)).toBe(
      false
    );
  });

  it("keine V9 bei B2B-Profil mit LinkedIn in platformKeys", () => {
    const b2bCtx: GuardContext = {
      ...vintageCtx,
      availablePlatformKeys: ["linkedin"],
    };
    const violations = validateSteps(
      {
        criticalAssumptions: ["a1", "a2"],
        diversityNote: null,
        modeNote: null,
        steps: [
          {
            ...baseStep(),
            assumptionId: "a1",
            strategyDimension: "MARKET_ACCESS",
            testSubject: "REACHABILITY",
            channel: "LinkedIn-Gruppen",
            metrics: baseStep().metrics,
          },
          {
            ...baseStep(),
            assumptionId: "a2",
            strategyDimension: "TARGET_GROUP",
            testSubject: "VALUE_UNDERSTANDING",
            channel: "LinkedIn Direktansprache",
            metrics: baseStep().metrics,
          },
        ],
      },
      b2bCtx
    );

    expect(violations.some((v) => v.rule === "V9")).toBe(false);
  });
});
