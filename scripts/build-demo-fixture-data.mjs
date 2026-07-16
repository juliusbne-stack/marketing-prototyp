/**
 * One-shot builder for scripts/demo-fixture-data.ts
 * Run: node scripts/build-demo-fixture-data.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "demo-fixture-data.ts");

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

const ENUM_PREFIX = {
  category: "StatementCategory",
  evidenceStatus: "EvidenceStatus",
  origin: "Origin",
  status: "OptionStatus",
  criterion: "Criterion",
  stepType: "StepType",
  strategyDimension: "StrategyDimension",
  testSubject: "TestSubject",
  laufmodus: "Laufmodus",
  evaluationMode: "EvaluationMode",
  valueType: "MetricValueType",
  aggregationStrategy: "AggregationStrategy",
  metricRole: "MetricRole",
  signalCategory: "SignalCategory",
  proxyStrength: "ProxyStrength",
  assessment: "KpiAssessment",
  result: "FeedbackResult",
  proposedNewStatus: "EvidenceStatus",
  herkunft: "TaskHerkunft",
  decision: "AdaptationType",
  segmentAspect: null,
  competitorAspect: null,
};

function objBlock(indent, obj) {
  const pad = " ".repeat(indent);
  const lines = ["{"];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === "string") {
      if (ENUM_PREFIX[k]) lines.push(`${pad}  ${k}: ${ENUM_PREFIX[k]}.${v},`);
      else lines.push(`${pad}  ${k}: \`${esc(v)}\`,`);
    } else if (typeof v === "boolean" || typeof v === "number")
      lines.push(`${pad}  ${k}: ${v},`);
    else if (Array.isArray(v)) {
      if (v.length === 0) lines.push(`${pad}  ${k}: [],`);
      else if (typeof v[0] === "string")
        lines.push(
          `${pad}  ${k}: [${v.map((x) => `\`${esc(x)}\``).join(", ")}],`
        );
      else lines.push(`${pad}  ${k}: ${JSON.stringify(v)},`);
    } else if (v && typeof v === "object") {
      lines.push(`${pad}  ${k}: ${objBlock(indent + 2, v)},`);
    }
  }
  lines.push(`${pad}}`);
  return lines.join("\n");
}

function recordBlock(key, obj) {
  return `  ${key}: ${objBlock(2, { key, ...obj })},`;
}

function parseJUS(text) {
  const justification = text.match(/Begründung:\s*([\s\S]*?)(?:Unsicherheit:|$)/)?.[1]?.trim();
  const uncertainty = text.match(/Unsicherheit:\s*([\s\S]*?)(?:Quelle:|$)/)?.[1]?.trim();
  const sourceRef = text.match(/Quelle:\s*([\s\S]*?)$/)?.[1]?.trim();
  const out = {};
  if (justification) out.justification = justification;
  if (uncertainty) out.uncertainty = uncertainty;
  if (sourceRef) out.sourceRef = sourceRef;
  return out;
}

const statements = {};

function addStmt(key, fields) {
  statements[key] = { key, adopted: true, ...fields };
}

// --- PESTEL (18, no POLITICAL) ---
const pestelRows = [
  ["p1_pestel_economic_01", "PESTEL_ECONOMIC", "FACT", "SIMULATED_RESEARCH", "Kühlpflichtiger Lebensmittelversand verursacht höhere Verpackungs-, Transport- und Zustellkosten als der Versand ungekühlter Produkte.", "Begründung: Die Kostenstruktur gekühlter D2C-Angebote wird stärker von Bestellwert, Versandvolumen und Lieferdichte beeinflusst.Unsicherheit: Die Kostenhöhe unterscheidet sich nach Region, Volumen und Dienstleister.Quelle: D2C-Food-Kostenmonitor 2026 (fiktiv)"],
  ["p1_pestel_economic_02", "PESTEL_ECONOMIC", "FACT", "SIMULATED_RESEARCH", "Schwankende Energie-, Rohstoff-, Verpackungs- und Logistikkosten erhöhen die Kalkulationsunsicherheit bei gekühlten Fertigmahlzeiten.", "Begründung: Veränderungen externer Kosten können Margen und Endpreise beeinflussen, ohne dass das Start-up sie vollständig kontrollieren kann.Unsicherheit: Die Entwicklung einzelner Kostenpositionen bleibt schwer vorhersehbar.Quelle: Food-Logistics-Index 2026 (fiktiv)"],
  ["p1_pestel_economic_03", "PESTEL_ECONOMIC", "ASSUMPTION", "SIMULATED_RESEARCH", "Eine erhöhte Preissensibilität erschwert den Absatz höherpreisiger Convenience-Produkte, wenn deren zusätzlicher Nutzen nicht klar erkennbar ist.", "Begründung: Premiumangebote konkurrieren mit Selbstkochen, Supermarktprodukten, Kantinen und Lieferdiensten.Unsicherheit: Die Stärke des Effekts variiert zwischen Kundensegmenten.Quelle: Premium-Convenience-Studie 2026 (fiktiv)"],
  ["p1_pestel_economic_04", "PESTEL_ECONOMIC", "OPEN_QUESTION", "AI_DERIVATION", "Offen ist, wie stabil die Nachfrage nach höherpreisigen gesundheitsorientierten Fertigmahlzeiten bei schwächerer Konsumstimmung bleibt.", "Begründung: Eine allgemein positive Nachfrage nach Convenience muss sich nicht gleichermaßen auf preisintensive Direktvertriebsangebote übertragen.Unsicherheit: Für den Pilotmarkt fehlen belastbare Nachfragewerte."],
  ["p1_pestel_social_01", "PESTEL_SOCIAL", "FACT", "SIMULATED_RESEARCH", "Gesundheitsorientierung und das Interesse an proteinreicher Ernährung sind über klassische Fitnesszielgruppen hinaus gesellschaftlich sichtbar.", "Begründung: Proteinbezogene Angebote können auch gesundheitsorientierte und überwiegend pflanzenbasiert lebende Personen ansprechen.Unsicherheit: Sichtbares Interesse führt nicht automatisch zu regelmäßigen Käufen.Quelle: Ernährungstrends Deutschland 2026 (fiktiv)"],
  ["p1_pestel_social_02", "PESTEL_SOCIAL", "FACT", "SIMULATED_RESEARCH", "Pflanzliche Ernährung wird zunehmend auch von Personen genutzt, die sich nicht dauerhaft oder vollständig vegan ernähren.", "Begründung: Ein veganes Produkt kann dadurch auch für Flexitarier und gesundheitsorientierte Mischköstler relevant sein.Unsicherheit: Nutzungshäufigkeit und Kaufmotive unterscheiden sich deutlich.Quelle: Plant-Based-Monitor 2026 (fiktiv)"],
  ["p1_pestel_social_03", "PESTEL_SOCIAL", "ASSUMPTION", "SIMULATED_RESEARCH", "Zeitintensive Arbeits- und Alltagsroutinen erhöhen den Bedarf an schnell verfügbaren und planbaren Mahlzeiten.", "Begründung: Convenience gewinnt an Bedeutung, wenn Einkauf, Kochen und Essensplanung mit anderen Verpflichtungen konkurrieren.Unsicherheit: Der Bedarf kann auch durch günstigere Alternativen gedeckt werden.Quelle: Arbeitsalltag & Ernährung 2026 (fiktiv)"],
  ["p1_pestel_social_04", "PESTEL_SOCIAL", "ASSUMPTION", "SIMULATED_RESEARCH", "Verbraucher erwarten bei gesundheitsorientierten Lebensmitteln zunehmend verständliche Angaben zu Zutaten, Nährwerten und funktionalem Nutzen.", "Begründung: Transparenz kann wahrgenommenes Kaufrisiko reduzieren und den Vergleich mit Alternativen erleichtern.Unsicherheit: Transparenz allein begründet noch keine Zahlungsbereitschaft.Quelle: Food-Transparency-Studie 2026 (fiktiv)"],
  ["p1_pestel_technological_01", "PESTEL_TECHNOLOGICAL", "FACT", "SIMULATED_RESEARCH", "Standardisierte D2C-Commerce-Systeme ermöglichen Boxkonfiguration, wiederkehrende Bestellungen, Zahlungsabwicklung und grundlegende Kundenanalyse.", "Begründung: Die technischen Markteintrittsbarrieren für einen grundlegenden Direktvertrieb sind dadurch geringer als bei Individualentwicklungen.Unsicherheit: Standardlösungen decken nicht jede operative Anforderung ab.Quelle: D2C-Commerce-Report 2026 (fiktiv)"],
  ["p1_pestel_technological_02", "PESTEL_TECHNOLOGICAL", "FACT", "SIMULATED_RESEARCH", "Temperaturüberwachung, Sendungsverfolgung und spezialisierte Kühlverpackungen verbessern die Kontrollierbarkeit gekühlter Lebensmittellieferungen.", "Begründung: Verfügbare Technologien können Qualitätsrisiken reduzieren und Abweichungen früher sichtbar machen.Unsicherheit: Zuverlässigkeit und Kosten unterscheiden sich zwischen Lösungen.Quelle: Cold-Chain-Tech-Report 2026 (fiktiv)"],
  ["p1_pestel_technological_03", "PESTEL_TECHNOLOGICAL", "OPEN_QUESTION", "AI_DERIVATION", "Offen ist, wie flächendeckend zuverlässige und wirtschaftliche Kühlversandkapazitäten im vorgesehenen Pilotgebiet verfügbar sind.", "Begründung: Die regionale Infrastruktur begrenzt Liefergebiet, Lieferfrequenz und erreichbare Servicequalität.Unsicherheit: Es fehlen vergleichbare Angebote und reale Pilotsendungen."],
  ["p1_pestel_ecological_01", "PESTEL_ECOLOGICAL", "FACT", "SIMULATED_RESEARCH", "Verpackungsabfälle und transportbedingte Emissionen stehen bei gekühlten Lebensmittel-Liefermodellen zunehmend unter gesellschaftlicher Beobachtung.", "Begründung: Der ökologische Eindruck des Liefermodells kann die positive Wahrnehmung eines pflanzlichen Produkts einschränken.Unsicherheit: Die Bewertung hängt von Material, Entfernung und Auslastung ab.Quelle: Food-Delivery-Ökobilanz 2026 (fiktiv)"],
  ["p1_pestel_ecological_02", "PESTEL_ECOLOGICAL", "FACT", "SIMULATED_RESEARCH", "Die Vermeidung von Lebensmittelverlusten gewinnt bei frischen und gekühlten Convenience-Produkten ökologisch und wirtschaftlich an Bedeutung.", "Begründung: Begrenzte Haltbarkeit erhöht die Bedeutung genauer Produktionsplanung und realistischer Nachfrageprognosen.Unsicherheit: Verlustraten hängen stark vom Betriebsmodell ab.Quelle: Food-Waste-Monitor 2026 (fiktiv)"],
  ["p1_pestel_ecological_03", "PESTEL_ECOLOGICAL", "ASSUMPTION", "SIMULATED_RESEARCH", "Pflanzliche Lebensmittel können positiv mit Nachhaltigkeit verbunden werden, während Einwegverpackung und gekühlter Einzelversand diesen Vorteil abschwächen können.", "Begründung: Die ökologische Markenwahrnehmung entsteht aus dem Gesamtangebot und nicht allein aus der Rezeptur.Unsicherheit: Die Gewichtung durch die Zielgruppen ist ungeklärt.Quelle: Sustainable-Packaging-Study 2026 (fiktiv)"],
  ["p1_pestel_legal_01", "PESTEL_LEGAL", "FACT", "SIMULATED_RESEARCH", "Beim Online-Verkauf von Lebensmitteln müssen wesentliche Produktinformationen bereits vor Abschluss der Bestellung zugänglich sein.", "Begründung: Der Online-Store muss Zutaten, Allergene, Aufbewahrung und Zubereitung strukturiert darstellen.Unsicherheit: Die konkrete Umsetzung muss rechtlich geprüft werden.Quelle: Online-Food-Compliance 2026 (fiktiv)"],
  ["p1_pestel_legal_02", "PESTEL_LEGAL", "FACT", "SIMULATED_RESEARCH", "Nährwertbezogene Aussagen wie ein hoher Proteingehalt müssen durch die Zusammensetzung des jeweiligen Produkts belegbar sein.", "Begründung: Das zentrale Kommunikationsversprechen ist nur nutzbar, wenn die Rezepturen die erforderlichen Bedingungen erfüllen.Unsicherheit: Die finalen Rezepturen wurden noch nicht vollständig geprüft.Quelle: Nutrition-Claims-Guide 2026 (fiktiv)"],
  ["p1_pestel_legal_03", "PESTEL_LEGAL", "FACT", "SIMULATED_RESEARCH", "Produktion, Lagerung und Zustellung gekühlter Mahlzeiten unterliegen Hygiene-, Temperatur- und Rückverfolgbarkeitsanforderungen.", "Begründung: Die Anforderungen gelten entlang der gesamten Leistungskette und begrenzen eine unkontrollierte Skalierung.Unsicherheit: Die konkrete Prozessausgestaltung ist noch nicht geprüft.Quelle: Chilled-Food-Safety 2026 (fiktiv)"],
  ["p1_pestel_legal_04", "PESTEL_LEGAL", "FACT", "SIMULATED_RESEARCH", "Verpackungs-, Entsorgungs- und Verbraucherpflichten beeinflussen Materialwahl, Versandprozess und Kommunikation im Lebensmittel-Direktvertrieb.", "Begründung: Rechtliche Vorgaben können zusätzliche organisatorische und finanzielle Anforderungen erzeugen.Unsicherheit: Der konkrete Pflichtenumfang hängt vom gewählten Modell ab.Quelle: Packaging-Obligations 2026 (fiktiv)"],
];
for (const [key, category, evidenceStatus, origin, content, jus] of pestelRows) {
  addStmt(key, { phase: 1, category, content, evidenceStatus, origin, ...parseJUS(jus) });
}

// --- Segments (3×6) ---
const segmentDefs = [
  {
    slug: "fitness",
    label: "Fitnessorientierte Berufstätige",
    aspects: [
      ["who_core", "WHO_CORE", "ASSUMPTION", "AI_DERIVATION", "Fitnessorientierte Berufstätige zwischen etwa 25 und 39 Jahren trainieren regelmäßig, achten auf Protein und Nährwerte und verfügen an Arbeitstagen nur über begrenzte Zeit für Meal Prep.", "Begründung: Das Segment verbindet den funktionalen Produktvorteil High Protein mit einem konkreten Convenience-Problem.Unsicherheit: Größe und Kaufhäufigkeit sind ungeprüft."],
      ["who_distinguishers", "WHO_DISTINGUISHERS", "ASSUMPTION", "AI_DERIVATION", "Das Segment unterscheidet sich durch regelmäßiges Training, aktiven Nährwertvergleich und den Wunsch, Ernährung trotz hoher Arbeitsbelastung kontrollierbar zu halten.", "Begründung: Diese Merkmale machen Proteinmenge, Portionsgröße und verlässliche Verfügbarkeit besonders relevant.Unsicherheit: Nicht jeder sportlich Aktive empfindet Meal Prep als Problem."],
      ["problem_need", "PROBLEM_NEED", "ASSUMPTION", "AI_DERIVATION", "Das Segment benötigt sättigende, proteinreiche Mahlzeiten, die ohne tägliche Vorbereitung verfügbar sind und sich in Arbeits-, Trainings- und Regenerationsroutinen integrieren lassen.", "Begründung: Selbst zubereitetes Meal Prep erfüllt den Bedarf, bindet aber regelmäßig Zeit für Planung, Einkauf und Kochen.Unsicherheit: Die Problemintensität muss validiert werden."],
      ["behavior_context", "BEHAVIOR_CONTEXT", "ASSUMPTION", "SIMULATED_RESEARCH", "Bei Zeitmangel wechselt das Segment zwischen eigenem Meal Prep, Supermarkt-Convenience, Proteinprodukten, Kantinen und spontanen Lieferdienstbestellungen.", "Begründung: Bestehende Lösungen erfüllen nur Teilbedürfnisse hinsichtlich Protein, Aufwand, Abwechslung, Preis oder Geschmack.Unsicherheit: Nutzungshäufigkeit und Alternativen variieren.Quelle: Segment-Snapshot Fitnessorientierte Berufstätige 2026 (fiktiv)"],
      ["willingness_to_pay", "WILLINGNESS_TO_PAY", "OPEN_QUESTION", "AI_DERIVATION", "Offen ist, ob das Segment innerhalb einer Mehrfachbox regelmäßig etwa 9,90 bis 11,90 Euro je gekühlter High-Protein-Mahlzeit bezahlt.", "Begründung: Protein, Convenience und Nährwerttransparenz können einen Mehrpreis begründen, konkurrieren aber mit günstigerem Meal Prep.Unsicherheit: Interesse und tatsächliche Zahlungsbereitschaft sind nicht gleichzusetzen."],
      ["reachability", "REACHABILITY", "ASSUMPTION", "SIMULATED_RESEARCH", "Das Segment erscheint über Fitnessstudios, Trainingscommunities, Sportveranstaltungen, Trainer, Creator sowie performanceorientierte Inhalte grundsätzlich erreichbar.", "Begründung: Sport- und Ernährungsinteressen erzeugen thematisch konzentrierte digitale und lokale Kontaktpunkte.Unsicherheit: Erreichbarkeit sagt noch nichts über Akquisitionskosten oder Kaufbereitschaft aus.Quelle: Segment-Snapshot Fitnessorientierte Berufstätige 2026 (fiktiv)"],
    ],
  },
  {
    slug: "zeit",
    label: "Zeitknappe gesundheitsbewusste Professionals",
    aspects: [
      ["who_core", "WHO_CORE", "ASSUMPTION", "AI_DERIVATION", "Beruflich stark beanspruchte Erwachsene zwischen etwa 28 und 44 Jahren möchten ausgewogen essen, ohne täglich umfangreiche Planung und Zubereitung zu organisieren.", "Begründung: Das Segment verbindet Gesundheitsorientierung mit hoher Arbeitsbelastung und Bedarf nach verlässlicher Alltagserleichterung.Unsicherheit: Das Segment ist breit und muss weiter eingegrenzt werden."],
      ["who_distinguishers", "WHO_DISTINGUISHERS", "ASSUMPTION", "AI_DERIVATION", "Das Segment wird stärker durch Zeitknappheit, Planungsaufwand und wechselnde Arbeitsorte geprägt als durch sportliche Leistungsziele oder eine feste Ernährungsform.", "Begründung: Protein ist eher Qualitäts- und Sättigungsmerkmal als primärer Kaufzweck.Unsicherheit: Unterschiede zwischen Büro-, Hybrid- und Homeoffice-Tagen sind offen."],
      ["problem_need", "PROBLEM_NEED", "ASSUMPTION", "AI_DERIVATION", "Das Segment benötigt eine verlässliche Mahlzeitenlösung, die eine ausgewogene Ernährung ermöglicht, ohne an jedem Arbeitstag Einkauf, Rezeptauswahl, Kochen und Abwasch einzuplanen.", "Begründung: Bei hoher Arbeitsbelastung konkurrieren Ernährungsziele mit Bequemlichkeit und spontanen Terminänderungen.Unsicherheit: Die Bereitschaft zur langfristigen Nutzung ist unbekannt."],
      ["behavior_context", "BEHAVIOR_CONTEXT", "ASSUMPTION", "SIMULATED_RESEARCH", "Das Segment nutzt eine wechselnde Kombination aus Kantine, Lieferdiensten, Supermarkt-Convenience, schnellen selbst gekochten Gerichten und vorbereiteten Mahlzeiten.", "Begründung: Die Ernährung wird situativ organisiert und folgt häufig keiner stabilen Wochenlösung.Unsicherheit: Die tatsächliche Häufigkeit je Alternative ist ungeklärt.Quelle: Segment-Snapshot Zeitknappe gesundheitsbewusste Professionals 2026 (fiktiv)"],
      ["willingness_to_pay", "WILLINGNESS_TO_PAY", "OPEN_QUESTION", "AI_DERIVATION", "Offen ist, welchen Mehrpreis das Segment gegenüber Supermarkt-Convenience für Zeitersparnis, Nährwertqualität, Lieferung und verlässlichen Geschmack akzeptiert.", "Begründung: Das verfügbare Einkommen kann höher sein, der Mehrwert muss gegenüber vielen Alternativen dennoch deutlich werden.Unsicherheit: Gesundheitsorientierung belegt keine regelmäßige Kaufbereitschaft."],
      ["reachability", "REACHABILITY", "ASSUMPTION", "SIMULATED_RESEARCH", "Das Segment erscheint über Suchmaschinen, berufliche Netzwerke, Coworking-Spaces, Arbeitgeberkooperationen, Büro-Communities und Gesundheitsnewsletter erreichbar.", "Begründung: Die Kontaktpunkte orientieren sich stärker an Arbeitsalltag und Gesundheit als an einer einzelnen Szene.Unsicherheit: Breite Kanäle können hohe Streuverluste erzeugen.Quelle: Segment-Snapshot Zeitknappe gesundheitsbewusste Professionals 2026 (fiktiv)"],
    ],
  },
  {
    slug: "pflanzlich",
    label: "Pflanzlich orientierte Convenience-Käufer",
    aspects: [
      ["who_core", "WHO_CORE", "ASSUMPTION", "AI_DERIVATION", "Vegan oder überwiegend pflanzlich lebende Personen suchen alltagstaugliche Fertigmahlzeiten mit attraktiven Rezepten, transparenten Zutaten und ausreichendem Proteingehalt.", "Begründung: Das Segment verbindet eine klare Ernährungspräferenz mit dem Wunsch nach bequemen und nährwertlich überzeugenden Mahlzeiten.Unsicherheit: Kaufhäufigkeit und Segmentgröße im Pilotgebiet sind unbekannt."],
      ["who_distinguishers", "WHO_DISTINGUISHERS", "ASSUMPTION", "AI_DERIVATION", "Die pflanzliche Ausrichtung ist für dieses Segment nicht nur Zusatznutzen, sondern zentrale Produkterwartung; Zutaten, Glaubwürdigkeit und Verpackung werden stärker geprüft.", "Begründung: Die Kaufentscheidung kann dadurch stärker von Markenvertrauen und Produkttransparenz abhängen.Unsicherheit: Nicht alle pflanzlich orientierten Käufer prüfen Produkte gleich intensiv."],
      ["problem_need", "PROBLEM_NEED", "ASSUMPTION", "AI_DERIVATION", "Das Segment benötigt vegane Convenience-Gerichte, die Protein, Sättigung, Geschmack, Abwechslung und transparente Zutaten überzeugend verbinden.", "Begründung: Viele Lösungen erfüllen die Ernährungsform, unterscheiden sich aber hinsichtlich Nährwertprofil, Portionsgröße und Alltagstauglichkeit.Unsicherheit: Die Unzufriedenheit mit bestehenden Alternativen ist nicht belegt."],
      ["behavior_context", "BEHAVIOR_CONTEXT", "ASSUMPTION", "SIMULATED_RESEARCH", "Das Segment vergleicht Zutatenlisten und Nährwerte, kocht teilweise selbst und ergänzt den Alltag durch vegane Supermarktprodukte, Bowls, Lieferdienste und spezialisierte Marken.", "Begründung: Ernährungsform, Geschmack, Nährwertqualität, Komfort und Markenvertrauen wirken gemeinsam.Unsicherheit: Die relative Bedeutung der Kriterien ist offen.Quelle: Segment-Snapshot Pflanzlich orientierte Convenience-Käufer 2026 (fiktiv)"],
      ["willingness_to_pay", "WILLINGNESS_TO_PAY", "OPEN_QUESTION", "AI_DERIVATION", "Offen ist, ob hochwertige Zutaten, hoher Proteingehalt und vollständig vegane Rezepturen einen regelmäßigen Preis oberhalb klassischer veganer Supermarktgerichte rechtfertigen.", "Begründung: Spezialisierung kann Mehrwert schaffen, zugleich bestehen zahlreiche günstigere Alternativen.Unsicherheit: Markeninteresse darf nicht mit dauerhafter Zahlungsbereitschaft verwechselt werden."],
      ["reachability", "REACHABILITY", "ASSUMPTION", "SIMULATED_RESEARCH", "Das Segment erscheint über vegane Communities, thematische Creator, Ernährungsplattformen, Newsletter, Veranstaltungen und Kooperationen mit veganen Marken erreichbar.", "Begründung: Die Ernährungsorientierung schafft klar identifizierbare Interessenräume.Unsicherheit: Gute thematische Erreichbarkeit kann mit begrenzter Segmentgröße einhergehen.Quelle: Segment-Snapshot Pflanzlich orientierte Convenience-Käufer 2026 (fiktiv)"],
    ],
  },
];
for (const seg of segmentDefs) {
  for (const [aspSlug, aspect, ev, orig, content, jus] of seg.aspects) {
    addStmt(`segment_${seg.slug}_${aspSlug}`, {
      phase: 1,
      category: "TARGET_SEGMENT",
      content,
      evidenceStatus: ev,
      origin: orig,
      segmentLabel: seg.label,
      segmentAspect: aspect,
      ...parseJUS(jus),
    });
  }
}

// --- Customer problems (6) ---
const cpRows = [
  ["cp_fitness_01", "Fitnessorientierte Berufstätige", "Regelmäßige proteinreiche Ernährung erfordert wiederkehrende Planung, Einkauf, Kochen, Portionierung und Lagerung, die im Arbeits- und Trainingsalltag als belastend empfunden werden können.", "ASSUMPTION", "AI_DERIVATION", "Begründung: Das Problem verbindet den funktionalen Produktnutzen unmittelbar mit einem wiederkehrenden Aufwand.Unsicherheit: Problemintensität und Zahlungsbereitschaft müssen getrennt geprüft werden."],
  ["cp_fitness_02", "Fitnessorientierte Berufstätige", "An unvorhersehbaren Arbeitstagen führt fehlendes Meal Prep vermutlich zu proteinärmeren oder weniger ausgewogenen Ersatzlösungen.", "ASSUMPTION", "AI_DERIVATION", "Begründung: Der Bedarf entsteht besonders dann, wenn geplante Routinen ausfallen und schnell verfügbare Alternativen dominieren.Unsicherheit: Häufigkeit und subjektive Relevanz sind offen."],
  ["cp_zeit_01", "Zeitknappe gesundheitsbewusste Professionals", "An arbeitsintensiven Tagen werden gesundheitliche Ernährungsziele häufig durch spontan verfügbare, aber weniger ausgewogene Mahlzeiten ersetzt.", "ASSUMPTION", "SIMULATED_RESEARCH", "Begründung: Zwischen langfristiger Gesundheitsorientierung und kurzfristiger Bequemlichkeit besteht ein wiederkehrender Alltagskonflikt.Unsicherheit: Häufigkeit und wirtschaftliche Relevanz sind ungeklärt.Quelle: Ernährung unter Zeitdruck 2026 (fiktiv)"],
  ["cp_zeit_02", "Zeitknappe gesundheitsbewusste Professionals", "Die mentale Belastung durch Auswahl, Einkauf und Wochenplanung kann selbst dann bestehen, wenn grundsätzlich Zeit zum Kochen vorhanden wäre.", "ASSUMPTION", "AI_DERIVATION", "Begründung: Das Angebot adressiert damit nicht nur reine Zubereitungszeit, sondern auch Planungs- und Entscheidungsaufwand.Unsicherheit: Die relative Bedeutung gegenüber Preis und Geschmack ist offen."],
  ["cp_pflanzlich_01", "Pflanzlich orientierte Convenience-Käufer", "Vegane Fertigmahlzeiten erfüllen möglicherweise nicht gleichzeitig die Erwartungen an Protein, Sättigung, Abwechslung, transparente Zutaten und schnelle Verfügbarkeit.", "ASSUMPTION", "AI_DERIVATION", "Begründung: Eine Lücke zwischen veganer Verfügbarkeit und funktionaler Produktqualität könnte eine spezialisierte Positionierung ermöglichen.Unsicherheit: Umfang und Relevanz der Angebotslücke sind nicht validiert."],
  ["cp_pflanzlich_02", "Pflanzlich orientierte Convenience-Käufer", "Viele pflanzliche Convenience-Angebote werden vermutlich als gelegentliche Alternative statt als verlässliche wiederkehrende Mahlzeitenlösung genutzt.", "ASSUMPTION", "AI_DERIVATION", "Begründung: Wiederholungskäufe setzen gleichbleibenden Geschmack, Sättigung, Abwechslung und Vertrauen voraus.Unsicherheit: Reale Wiederkaufsdaten fehlen."],
];
for (const [key, label, content, ev, orig, jus] of cpRows) {
  addStmt(key, {
    phase: 1,
    category: "CUSTOMER_PROBLEM",
    content,
    evidenceStatus: ev,
    origin: orig,
    segmentLabel: label,
    ...parseJUS(jus),
  });
}

// --- Competitors (10×6) ---
const competitorProfiles = [
  {
    slug: "fitcool",
    label: "FitFuel Meals (fiktiv)",
    aspects: {
      ENTITY_TYPE: "Direkter Wettbewerber",
      OFFERING: "Gekühlte Fitness-Mahlzeiten mit Makronährwertangaben; gemischtes Sortiment aus Fleisch- und vegetarischen Gerichten.",
      TARGET_CUSTOMERS: "Kraftsportler und fitnessorientierte Männer und Frauen mit wenig Zeit.",
      PRICING: "6er- bis 14er-Boxen; etwa 9,50–12,00 Euro je Gericht; Versand ab Mindestbestellwert.",
      SCALE: "Klare Performance-Positionierung, große Portionsgrößen und bekannte Fitness-Creator.",
      RELEVANCE: "Vegane Auswahl begrenzt; stark sportlich-männliche Ansprache kann breitere gesundheitsorientierte Käufer ausschließen.",
    },
  },
  {
    slug: "greenprep",
    label: "GreenPrep Kitchen (fiktiv)",
    aspects: {
      ENTITY_TYPE: "Direkter Wettbewerber",
      OFFERING: "Ausschließlich vegane, gekühlte Wochenboxen mit Zutaten- und Nachhaltigkeitsfokus.",
      TARGET_CUSTOMERS: "Vegan lebende urbane Konsumenten und nachhaltigkeitsorientierte Haushalte.",
      PRICING: "8er- und 12er-Boxen; etwa 10,50–12,50 Euro je Gericht; Abo-Rabatt.",
      SCALE: "Glaubwürdige vegane Marke, transparente Zutaten und starke Nachhaltigkeitskommunikation.",
      RELEVANCE: "Proteingehalt und Performance-Nutzen sind nachrangig; weniger anschlussfähig für fitnessorientierte Flexitarier.",
    },
  },
  {
    slug: "urbanmacro",
    label: "UrbanMacro (fiktiv)",
    aspects: {
      ENTITY_TYPE: "Direkter Wettbewerber",
      OFFERING: "Personalisierbare Makro-Mahlzeiten mit Auswahl nach Kalorien- und Proteinziel.",
      TARGET_CUSTOMERS: "Daten- und leistungsorientierte Sportler sowie Diätkunden.",
      PRICING: "Einzelkonfiguration ab 11,90 Euro; Mindestmenge zehn Gerichte.",
      SCALE: "Hohe Personalisierung und präzise Nährwertsteuerung.",
      RELEVANCE: "Komplexe Auswahl, hohe Einstiegshürde und geringe emotionale Markenbreite.",
    },
  },
  {
    slug: "veganbatch",
    label: "VeganBatch (fiktiv)",
    aspects: {
      ENTITY_TYPE: "Direkter Wettbewerber",
      OFFERING: "Tiefgekühlte vegane Mahlzeiten und Bowls im Online-Abo.",
      TARGET_CUSTOMERS: "Pflanzlich orientierte Haushalte mit Vorrats- und Convenience-Bedarf.",
      PRICING: "12er-Box ab etwa 8,90 Euro je Mahlzeit; Versand inklusive.",
      SCALE: "Lange Haltbarkeit, günstiger Stückpreis und geringe Lieferfrequenz.",
      RELEVANCE: "Tiefkühlformat wird teilweise als weniger frisch wahrgenommen; Proteinfokus fehlt.",
    },
  },
  {
    slug: "freshform",
    label: "FreshForm Meals (fiktiv)",
    aspects: {
      ENTITY_TYPE: "Direkter Wettbewerber",
      OFFERING: "Gekühlte gesundheitsorientierte Fertiggerichte mit Fokus auf Kalorienkontrolle und alltagstaugliche Ernährung.",
      TARGET_CUSTOMERS: "Berufstätige, Abnehmwillige und gesundheitsorientierte Professionals.",
      PRICING: "6er-Testbox und flexible Wochenboxen; 9,90–11,50 Euro je Gericht.",
      SCALE: "Breite Gesundheitsansprache und niedrige Einstiegshürde.",
      RELEVANCE: "Wenig klare Differenzierung; vegane und proteinreiche Varianten sind nur Teil des Sortiments.",
    },
  },
  {
    slug: "supermarkt",
    label: "Supermarkt-Convenience",
    aspects: {
      ENTITY_TYPE: "Indirekter Wettbewerber / Alternative",
      OFFERING: "Gekühlte und tiefgekühlte Fertiggerichte, Bowls, Salate und High-Protein-Produkte im stationären Handel.",
      TARGET_CUSTOMERS: "Breiter Massenmarkt mit spontanem Convenience-Bedarf.",
      PRICING: "Typisch etwa 3,50–8,00 Euro je Produkt.",
      SCALE: "Sofort verfügbar, kein Versand, niedriger Preis und bekannte Marken.",
      RELEVANCE: "Uneinheitliche Nährwertqualität, begrenzte vegane High-Protein-Auswahl und geringere Planbarkeit über mehrere Tage.",
    },
  },
  {
    slug: "kochbox",
    label: "Kochbox-Anbieter",
    aspects: {
      ENTITY_TYPE: "Indirekter Wettbewerber / Alternative",
      OFFERING: "Portionierte Zutaten und Rezepte zur Zubereitung zu Hause; teilweise vegane und proteinreiche Auswahl.",
      TARGET_CUSTOMERS: "Haushalte, die Abwechslung suchen und grundsätzlich kochen möchten.",
      PRICING: "Etwa 5,50–9,00 Euro je Portion plus eigener Zubereitungsaufwand.",
      SCALE: "Frische, Rezeptvielfalt und Erlebnischarakter.",
      RELEVANCE: "Löst Einkaufsaufwand, aber nicht Koch- und Abwaschzeit; Nährwerte sind nicht immer zentral.",
    },
  },
  {
    slug: "lieferdienst",
    label: "Lieferdienst-Plattformen",
    aspects: {
      ENTITY_TYPE: "Ersatzlösung",
      OFFERING: "Spontane Bestellung lokaler Restaurants, Bowls, Salate und veganer Gerichte.",
      TARGET_CUSTOMERS: "Situativer Sofortbedarf bei fehlender Zeit oder Planung.",
      PRICING: "Häufig 12–20 Euro je Mahlzeit inklusive Gebühren.",
      SCALE: "Große Auswahl, spontane Verfügbarkeit und kein Vorratsbedarf.",
      RELEVANCE: "Hohe variable Kosten, uneinheitliche Nährwerte und geringe Wochenplanbarkeit.",
    },
  },
  {
    slug: "mealprep",
    label: "Selbstorganisiertes Meal Prep",
    aspects: {
      ENTITY_TYPE: "Ersatzlösung",
      OFFERING: "Eigenständige Planung, Einkauf, Zubereitung und Portionierung mehrerer Mahlzeiten.",
      TARGET_CUSTOMERS: "Preisbewusste und ernährungsorientierte Personen mit Zeit und Routine.",
      PRICING: "Niedrigere Lebensmittelkosten, aber hoher Zeit- und Planungsaufwand.",
      SCALE: "Maximale Kontrolle über Zutaten, Makros, Geschmack und Preis.",
      RELEVANCE: "Wiederkehrender Aufwand, geringe Spontanität und Risiko monotoner Gerichte.",
    },
  },
  {
    slug: "kantine",
    label: "Kantine, Bowls und Protein-Snacks",
    aspects: {
      ENTITY_TYPE: "Ersatzlösung / Teilersatz",
      OFFERING: "Mittagstisch, Bowls, Skyr, Shakes, Riegel oder schnelle Snacks für einzelne Mahlzeitensituationen.",
      TARGET_CUSTOMERS: "Berufstätige mit situativem Bedarf am Arbeitsplatz oder unterwegs.",
      PRICING: "Breite Spanne von 2 bis 15 Euro.",
      SCALE: "Hohe Verfügbarkeit im Nutzungsmoment und geringe Vorausplanung.",
      RELEVANCE: "Deckt häufig nur einzelne Situationen; Protein, Ausgewogenheit und vegane Auswahl sind nicht verlässlich kombinierbar.",
    },
  },
];
for (const comp of competitorProfiles) {
  for (const [aspect, content] of Object.entries(comp.aspects)) {
    addStmt(`competitor_${comp.slug}_${aspect.toLowerCase()}`, {
      phase: 1,
      category: "COMPETITOR",
      content,
      evidenceStatus: "ASSUMPTION",
      origin: "SIMULATED_RESEARCH",
      competitorLabel: comp.label,
      competitorAspect: aspect,
      justification: "Wettbewerbsprofil aus simulierter Marktrecherche für die Prototyp-Demonstration.",
      uncertainty: "Marktdaten sind fiktiv und dienen ausschließlich der UI-Demonstration.",
      sourceRef: `Wettbewerbsprofil ${comp.label} 2026 (fiktiv)`,
    });
  }
}

// --- Resources (8) ---
const resRows = [
  ["p1_res_01", "FACT", "USER_INPUT", "Das dreiköpfige Team deckt Produktentwicklung, Ernährungsgrundlagen, Markenaufbau, Content und grundlegenden E-Commerce intern ab.", "Begründung: Die Kombination ermöglicht einen eigenständigen MVP-Aufbau ohne vollständige externe Agenturabhängigkeit.Unsicherheit: Die verfügbare Kapazität bleibt bei paralleler Produkt- und Marktarbeit begrenzt."],
  ["p1_res_02", "FACT", "USER_INPUT", "Erste Rezepturen und Nährwertberechnungen liegen vor und können als Grundlage für Produkt- und Kommunikationstests genutzt werden.", "Begründung: Ein testbares Produktkonzept ist bereits konkreter als eine reine Geschäftsidee.Unsicherheit: Finale Haltbarkeit, Claims und Produktionsstabilität sind noch nicht geprüft."],
  ["p1_res_03", "FACT", "USER_INPUT", "Das Team verfügt über ein vorläufiges visuelles Markenkonzept und kann Landingpages, Social Content und Testmaterialien selbst erstellen.", "Begründung: Dadurch lassen sich frühe Tests schnell und mit begrenztem Budget umsetzen.Unsicherheit: Professionelle Performance-Kampagnen und Skalierungserfahrung fehlen."],
  ["p1_res_04", "FACT", "USER_INPUT", "Für die frühe Pilotphase stehen rund 5.000 Euro pro Monat und etwa 30 gemeinsame Wochenstunden für Forschung und Markttests zur Verfügung.", "Begründung: Das Budget erlaubt fokussierte Experimente, aber keinen breiten Marktlaunch.Unsicherheit: Produktions- und Logistikkosten können den verfügbaren Testspielraum reduzieren."],
  ["p1_res_05", "FACT", "USER_INPUT", "Das Team besitzt nur begrenzte Erfahrung mit gekühlter Lebensmittel-Logistik, skalierter Produktion und dokumentierten Qualitätsprozessen.", "Begründung: Diese Lücke erhöht Umsetzungsrisiko und Abhängigkeit von spezialisierten Partnern.Unsicherheit: Der benötigte externe Unterstützungsumfang ist noch nicht geklärt."],
  ["p1_res_06", "FACT", "USER_INPUT", "Es bestehen persönliche Kontakte zu zwei lokalen Fitnessstudios, einem Personal Trainer und einer kleinen Sport-Community im Pilotgebiet.", "Begründung: Diese Beziehungen ermöglichen kostengünstige Rekrutierung für erste Interviews und Pilottests.Unsicherheit: Reichweite und Konversionspotenzial der Kontakte sind begrenzt."],
  ["p1_res_07", "FACT", "USER_INPUT", "Belastbare Daten zu Zahlungsbereitschaft, Wiederkauf, Lieferqualität, Akquisitionskosten und Deckungsbeitrag fehlen vollständig.", "Begründung: Die zentralen strategischen und wirtschaftlichen Entscheidungen beruhen damit noch auf Annahmen.Unsicherheit: Erste Pilotdaten können nur begrenzte Generalisierbarkeit besitzen."],
  ["p1_res_08", "OPEN_QUESTION", "AI_DERIVATION", "Offen ist, welcher Produktions- und Logistikaufbau für einen regionalen Pilot wirtschaftlich, rechtlich und operativ tragfähig ist.", "Begründung: Eigenproduktion, Lohnherstellung und spezialisierte Fulfillment-Partner erzeugen unterschiedliche Kosten und Kontrollmöglichkeiten.Unsicherheit: Konkrete Angebote und Testsendungen fehlen."],
];
for (const [key, ev, orig, content, jus] of resRows) {
  addStmt(key, { phase: 1, category: "RESOURCE", content, evidenceStatus: ev, origin: orig, ...parseJUS(jus) });
}

// --- SWOT (16) ---
const swotRows = [
  ["p1_swot_s1", "SWOT_STRENGTH", "ASSUMPTION", "AI_DERIVATION", "Klare Verbindung aus Convenience, hohem Proteingehalt und pflanzlicher Rezeptur.", "Begründung: Die Merkmalskombination kann gegenüber allgemeinen Fertiggerichten eine verständliche Differenzierung schaffen.Unsicherheit: Die tatsächliche Relevanz muss im Zielsegment geprüft werden."],
  ["p1_swot_s2", "SWOT_STRENGTH", "FACT", "USER_INPUT", "Komplementäres Kernteam mit Produkt-, Ernährungs-, Marken- und Content-Kompetenzen.", "Begründung: Wesentliche MVP- und Kommunikationsaufgaben können intern umgesetzt werden.Unsicherheit: Kühlketten- und Skalierungskompetenz fehlen."],
  ["p1_swot_s3", "SWOT_STRENGTH", "FACT", "USER_INPUT", "Ein eigener Online-Store ermöglicht direkte Kundendaten, flexible Tests und Kontrolle über Produktdarstellung und Wiederbestellung.", "Begründung: D2C unterstützt Lernen über Varianten, Preis, Boxgröße und Wiederkauf.Unsicherheit: Aussagekräftige Daten entstehen erst bei ausreichendem Traffic."],
  ["p1_swot_s4", "SWOT_STRENGTH", "FACT", "USER_INPUT", "Erste Rezepturen und informelle Verkostungen reduzieren den Abstand zwischen Konzept und realem Produkttest.", "Begründung: Ein physisch erlebbares MVP kann Nutzen, Geschmack und Wiederkauf besser prüfen als reine Kommunikation.Unsicherheit: Die Stichprobe war klein und nicht systematisch."],
  ["p1_swot_w1", "SWOT_WEAKNESS", "FACT", "USER_INPUT", "Keine belastbaren Nachweise zu Zahlungsbereitschaft, Wiederkaufsrate und wirtschaftlicher Kundenakquisition.", "Begründung: Die zentralen Wert- und Wachstumshypothesen sind noch offen.Unsicherheit: Frühe Tests liefern nur begrenzte Sicherheit."],
  ["p1_swot_w2", "SWOT_WEAKNESS", "FACT", "USER_INPUT", "Begrenzte Erfahrung mit Kühlkette, Lebensmittelrecht und skalierter Produktion.", "Begründung: Fehler können Qualität, Sicherheit, Kosten und Markenvertrauen beeinträchtigen.Unsicherheit: Externe Partner können die Lücke teilweise schließen."],
  ["p1_swot_w3", "SWOT_WEAKNESS", "FACT", "USER_INPUT", "Das verfügbare Budget reicht nicht für parallele Bearbeitung mehrerer Zielgruppen und einen breiten Launch.", "Begründung: Das Start-up muss Segment, Angebot und Tests bewusst priorisieren.Unsicherheit: Partnerschaften könnten Reichweite und Ressourcen erweitern."],
  ["p1_swot_w4", "SWOT_WEAKNESS", "ASSUMPTION", "AI_DERIVATION", "Die vorläufige Produktidee verbindet viele Vorteile und kann dadurch kommunikativ zu breit oder austauschbar wirken.", "Begründung: Vegan, High Protein, gesund, bequem und nachhaltig konkurrieren um Aufmerksamkeit.Unsicherheit: Die stärkste Nutzenhierarchie ist noch nicht validiert."],
  ["p1_swot_o1", "SWOT_OPPORTUNITY", "FACT", "USER_INPUT", "Gesundheits-, Protein- und Convenience-Trends schaffen mehrere anschlussfähige Zielgruppenpfade.", "Begründung: Das Angebot kann unterschiedliche Probleme adressieren, ohne auf rein vegane Käufer begrenzt zu sein.Unsicherheit: Mehrere Pfade erhöhen zugleich Priorisierungsbedarf."],
  ["p1_swot_o2", "SWOT_OPPORTUNITY", "ASSUMPTION", "AI_DERIVATION", "Fitnessstudios und lokale Sport-Communities ermöglichen eine fokussierte regionale Pilotierung.", "Begründung: Kooperationen können Vertrauen, Rekrutierung und Probierkontakte mit begrenztem Media-Budget verbinden.Unsicherheit: Partnerbereitschaft und Skalierbarkeit sind offen."],
  ["p1_swot_o3", "SWOT_OPPORTUNITY", "ASSUMPTION", "AI_DERIVATION", "Eine flexible Wiederbestellung ohne Abozwang könnte die Einstiegshürde gegenüber klassischen Subscription-Modellen senken.", "Begründung: Kunden können testen, ohne langfristige Bindung wahrzunehmen.Unsicherheit: Wiederholungskäufe und Planbarkeit für Nouriva bleiben ungeprüft."],
  ["p1_swot_o4", "SWOT_OPPORTUNITY", "FACT", "USER_INPUT", "Die Kombination aus tatsächlichem Produkttest und digitalem Direktvertrieb ermöglicht schnelles Lernen über Geschmack, Preis, Boxgröße und Wiederkauf.", "Begründung: Mehrere strategische Annahmen können mit begrenztem Pilotvolumen direkt beobachtet werden.Unsicherheit: Operative Qualität muss ausreichend stabil sein."],
  ["p1_swot_t1", "SWOT_THREAT", "ASSUMPTION", "AI_DERIVATION", "Hohe Preissensibilität kann den Wechsel von Meal Prep oder Supermarktprodukten zu einem Premium-D2C-Angebot begrenzen.", "Begründung: Der Nutzen muss den Preis- und Versandaufschlag sichtbar rechtfertigen.Unsicherheit: Die Preisgrenze ist segmentspezifisch."],
  ["p1_swot_t2", "SWOT_THREAT", "FACT", "USER_INPUT", "Fehler bei Temperatur, Zustellung oder Haltbarkeit können Vertrauen und Wiederkauf bereits im Pilot stark beschädigen.", "Begründung: Lebensmittelqualität ist unmittelbar erfahrbar und schwer kommunikativ auszugleichen.Unsicherheit: Die reale Fehlerwahrscheinlichkeit ist noch unbekannt."],
  ["p1_swot_t3", "SWOT_THREAT", "ASSUMPTION", "AI_DERIVATION", "Direkte und indirekte Wettbewerber können einzelne Merkmale wie High Protein, vegan oder Convenience schnell nachahmen.", "Begründung: Langfristige Differenzierung erfordert mehr als eine isolierte Produkteigenschaft.Unsicherheit: Markenbindung und Servicequalität sind noch nicht aufgebaut."],
  ["p1_swot_t4", "SWOT_THREAT", "FACT", "USER_INPUT", "Rechtliche oder kommunikative Fehler bei Claims, Allergenen oder Produktinformationen können Markteinführung und Reputation beeinträchtigen.", "Begründung: Das Leistungsversprechen ist eng mit regulierten Produktangaben verbunden.Unsicherheit: Die finale rechtliche Prüfung steht aus."],
];
for (const [key, cat, ev, orig, content, jus] of swotRows) {
  addStmt(key, { phase: 1, category: cat, content, evidenceStatus: ev, origin: orig, ...parseJUS(jus) });
}

// --- Market paths (3) ---
const pathRows = [
  ["p1_path_01", "Regionaler D2C-Pilot für fitnessorientierte Berufstätige mit klarem Fokus auf Protein, Geschmack und Zeitersparnis.", "ASSUMPTION", "AI_DERIVATION", "Begründung: Der Pfad verbindet klare Produktdifferenzierung, vorhandene Sportkontakte und direkt prüfbare Kauf- und Wiederkaufannahmen.Unsicherheit: Regelmäßige Zahlungsbereitschaft und Akquisitionskosten sind offen."],
  ["p1_path_02", "Gesunde Alltagslösung für zeitknappe Professionals mit D2C-Vertrieb und ergänzenden Arbeitgeber- oder Coworking-Kooperationen.", "ASSUMPTION", "AI_DERIVATION", "Begründung: Der potenzielle Markt ist breiter und der Nutzen alltagsnah, die Positionierung jedoch weniger eindeutig.Unsicherheit: Streuverluste, Differenzierung und Partnerzugang sind offen."],
  ["p1_path_03", "Pflanzliche Premium-Convenience für vegan und flexitarisch orientierte Käufer mit Community- und Creator-getriebenem Marktzugang.", "ASSUMPTION", "AI_DERIVATION", "Begründung: Der Pfad bietet hohe Markenpassung und klare Community-Kontaktpunkte.Unsicherheit: Segmentgröße, Preisakzeptanz und Relevanz des Proteinfokus sind ungeklärt."],
];
for (const [key, content, ev, orig, jus] of pathRows) {
  addStmt(key, { phase: 1, category: "MARKET_PATH", content, evidenceStatus: ev, origin: orig, ...parseJUS(jus) });
}

// --- Phase 2 OPT statements (3×6) ---
const optDims = [
  "OPT_TARGET_GROUP",
  "OPT_CUSTOMER_PROBLEM",
  "OPT_VALUE_PROPOSITION",
  "OPT_POSITIONING",
  "OPT_MARKET_ACCESS",
  "OPT_REVENUE_GROWTH",
];
const option1Data = {
  OPT_TARGET_GROUP: ["Fitnessorientierte Berufstätige zwischen 25 und 39 Jahren, die mindestens dreimal pro Woche trainieren, Nährwerte vergleichen und an Arbeitstagen wenig Zeit für Meal Prep haben.", "ASSUMPTION", "Das Segment passt am klarsten zum High-Protein-Merkmal und ist über vorhandene lokale Kontakte erreichbar.Unsicherheit: Segmentgröße und Kaufhäufigkeit sind ungeprüft."],
  OPT_CUSTOMER_PROBLEM: ["Regelmäßiges Meal Prep bindet Zeit und Planung; fällt es aus, greifen Betroffene auf weniger passende oder proteinärmere Alternativen zurück.", "ASSUMPTION", "Das Problem ist wiederkehrend, konkret und kann über Interviews sowie reale Nutzung beobachtet werden.Unsicherheit: Die wahrgenommene Belastung und Wechselbereitschaft sind offen."],
  OPT_VALUE_PROPOSITION: ["Fertig zubereitete vegane Mahlzeiten mit 30 bis 40 Gramm Protein, transparenten Makros und abwechslungsreichen Rezepten liefern in wenigen Minuten eine vollständige Performance-Mahlzeit.", "ASSUMPTION", "Der Nutzen verbindet Proteinziel, Zeitersparnis, Planbarkeit und Geschmack in einem Angebot.Unsicherheit: Produktqualität, Portion und wahrgenommener Mehrwert müssen im Pilot bestätigt werden."],
  OPT_POSITIONING: ["Nouriva wird als verlässliche High-Protein-Alltagslösung für aktive Berufstätige positioniert – einfacher als Meal Prep und nährwertorientierter als klassische Convenience.", "ASSUMPTION", "Die Positionierung grenzt sich sowohl von selbst gekochtem Meal Prep als auch von generischen Fertiggerichten ab.Unsicherheit: Ob vegan als Haupt- oder Zusatzbotschaft wirken sollte, ist offen."],
  OPT_MARKET_ACCESS: ["Der Marktzugang erfolgt zunächst über lokale Fitnessstudios, Trainer, Sport-Communities, gezielte Creator-Kooperationen und performancebezogene Social- und Search-Inhalte.", "ASSUMPTION", "Die Kanäle bündeln relevante Interessen und nutzen bestehende Kontakte für eine regionale Pilotierung.Unsicherheit: Reichweite, Conversion und Kosten pro zahlendem Kunden sind ungeprüft."],
  OPT_REVENUE_GROWTH: ["Eine 6er-Testbox senkt die Einstiegshürde; 10er- und 14er-Boxen sowie flexible Wiederbestellung sollen Stückkosten, Warenkorb und Wiederkauf erhöhen.", "OPEN_QUESTION", "Die Logik verbindet Testmöglichkeit mit wirtschaftlich attraktiveren größeren Bestellungen.Unsicherheit: Preis, Boxgröße, Versandkosten und Abonnementbereitschaft sind offen."],
};
const option2Data = {
  OPT_TARGET_GROUP: ["Zeitknappe gesundheitsbewusste Professionals zwischen etwa 28 und 44 Jahren mit hoher Arbeitsbelastung, wechselnden Arbeitsorten und mittlerem bis höherem Einkommen.", "ASSUMPTION", "Das Segment besitzt ein plausibles Convenience-Problem und kann regelmäßige Bestellungen finanziell eher tragen.Unsicherheit: Die Zielgruppe ist breit und schwerer effizient abzugrenzen."],
  OPT_CUSTOMER_PROBLEM: ["Gesunde Ernährung scheitert an arbeitsintensiven Tagen an Planung, Einkauf und Zubereitung; spontane Alternativen sind häufig teurer oder weniger ausgewogen.", "ASSUMPTION", "Das Problem ist alltagsnah und betrifft mehrere wiederkehrende Mahlzeitensituationen.Unsicherheit: Die Zahlungsbereitschaft für eine geplante Lösung ist offen."],
  OPT_VALUE_PROPOSITION: ["Nouriva bietet verlässliche, nährwertoptimierte Mahlzeiten für volle Arbeitstage, die ohne Einkauf und Kochen verfügbar sind und eine planbare gesunde Routine ermöglichen.", "ASSUMPTION", "Der Nutzen reduziert Zeit- und Entscheidungsaufwand statt primär sportliche Leistung zu versprechen.Unsicherheit: Differenzierung gegenüber Kochboxen, Bowls und Lieferdiensten muss geschärft werden."],
  OPT_POSITIONING: ["Nouriva wird als gesunde Alltagslösung zwischen Selbstkochen, Kantine und Lieferdienst positioniert – planbarer als spontane Bestellung und bequemer als Kochboxen.", "ASSUMPTION", "Die Positionierung nutzt einen breiten Nutzungskontext und mehrere bestehende Vergleichsangebote.Unsicherheit: Die Botschaft kann ohne starken Fokus austauschbar wirken."],
  OPT_MARKET_ACCESS: ["Suchmaschinen, LinkedIn, Coworking-Spaces, Arbeitgeberkooperationen, Business-Newsletter und betriebliche Gesundheitsangebote bilden den primären Marktzugang.", "OPEN_QUESTION", "Die Kanäle orientieren sich am Arbeitsalltag und könnten größere Nutzergruppen erreichen.Unsicherheit: Zugang, Streuverluste und längere B2B-Entscheidungswege sind offen."],
  OPT_REVENUE_GROWTH: ["Flexible Wochenboxen werden durch Firmenangebote, Probiertage und mögliche Arbeitgeberzuschüsse ergänzt; Wiederbestellung steht vor langfristiger Bindung.", "OPEN_QUESTION", "B2C und B2B2C können sich ergänzen und Akquisitionskosten reduzieren.Unsicherheit: Partnerinteresse, administrative Komplexität und Nutzungshäufigkeit sind ungeprüft."],
};
const option3Data = {
  OPT_TARGET_GROUP: ["Vegan und überwiegend pflanzlich lebende urbane Käufer, die regelmäßig Convenience-Produkte nutzen und Zutaten, Protein, Abwechslung und Nachhaltigkeit vergleichen.", "ASSUMPTION", "Die Zielgruppe besitzt eine klare Ernährungspräferenz und identifizierbare Community-Touchpoints.Unsicherheit: Segmentgröße und regelmäßige Premiumbereitschaft sind offen."],
  OPT_CUSTOMER_PROBLEM: ["Viele vegane Convenience-Angebote erfüllen nicht gleichzeitig die Erwartungen an Protein, Sättigung, Rezeptvielfalt, transparente Zutaten und Alltagstauglichkeit.", "ASSUMPTION", "Die vermutete Lücke schafft eine spezifische Positionierung jenseits der bloßen Vegan-Kennzeichnung.Unsicherheit: Die Unzufriedenheit mit Alternativen muss nachgewiesen werden."],
  OPT_VALUE_PROPOSITION: ["Abwechslungsreiche vegane Fertigmahlzeiten verbinden hohen Proteingehalt, nachvollziehbare Zutaten, ausgewogene Nährwerte und schnelle Zubereitung.", "ASSUMPTION", "Die Kombination adressiert funktionale und wertbezogene Erwartungen des Segments.Unsicherheit: Der Mehrwert gegenüber Supermarkt- und Tiefkühlangeboten ist ungeprüft."],
  OPT_POSITIONING: ["Nouriva wird als hochwertige vegane Convenience-Marke ohne Nährwertkompromisse positioniert – glaubwürdiger als generische Fertiggerichte und alltagstauglicher als tägliches Selbstkochen.", "ASSUMPTION", "Die Positionierung verbindet Markenwerte mit funktionaler Produktqualität.Unsicherheit: Nachhaltigkeits- und Verpackungserwartungen können zusätzlichen Aufwand erzeugen."],
  OPT_MARKET_ACCESS: ["Vegane Creator, Ernährungsplattformen, Community-Newsletter, Veranstaltungen, spezialisierte Cafés und Kooperationen mit pflanzlichen Marken bilden den Marktzugang.", "ASSUMPTION", "Die Zielgruppe lässt sich thematisch klarer adressieren als breite Gesundheitssegmente.Unsicherheit: Thematische Reichweite kann schnell gesättigt und kostenintensiv werden."],
  OPT_REVENUE_GROWTH: ["Themenboxen, saisonale Drops und flexible Abonnements sollen Vielfalt und Markenbindung fördern; Premiumpreise werden über Zutaten, Protein und Glaubwürdigkeit begründet.", "OPEN_QUESTION", "Sortiments- und Community-Logik können Wiederkauf unterstützen.Unsicherheit: Premiumpreis, Sortimentskomplexität und Wiederkaufsrhythmus sind offen."],
};
function addOptionStmts(prefix, data, criticalKeys = []) {
  for (const dim of optDims) {
    const slug = dim.replace("OPT_", "").toLowerCase();
    const [content, ev] = data[dim];
    const key = `${prefix}_opt_${slug}`;
    const fields = {
      phase: 2,
      category: dim,
      content,
      evidenceStatus: ev,
      origin: "AI_DERIVATION",
    };
    if (criticalKeys.includes(slug)) fields.isCritical = true;
    addStmt(key, fields);
  }
}
addOptionStmts("option1", option1Data, ["customer_problem", "revenue_growth", "value_proposition"]);
addOptionStmts("option2", option2Data);
addOptionStmts("option3", option3Data);

// Fix OPT justification parsing - set explicitly
const optJust = {
  option1_opt_target_group: "Das Segment passt am klarsten zum High-Protein-Merkmal und ist über vorhandene lokale Kontakte erreichbar.",
  option1_opt_customer_problem: "Das Problem ist wiederkehrend, konkret und kann über Interviews sowie reale Nutzung beobachtet werden.",
  option1_opt_value_proposition: "Der Nutzen verbindet Proteinziel, Zeitersparnis, Planbarkeit und Geschmack in einem Angebot.",
  option1_opt_positioning: "Die Positionierung grenzt sich sowohl von selbst gekochtem Meal Prep als auch von generischen Fertiggerichten ab.",
  option1_opt_market_access: "Die Kanäle bündeln relevante Interessen und nutzen bestehende Kontakte für eine regionale Pilotierung.",
  option1_opt_revenue_growth: "Die Logik verbindet Testmöglichkeit mit wirtschaftlich attraktiveren größeren Bestellungen.",
  option2_opt_target_group: "Das Segment besitzt ein plausibles Convenience-Problem und kann regelmäßige Bestellungen finanziell eher tragen.",
  option2_opt_customer_problem: "Das Problem ist alltagsnah und betrifft mehrere wiederkehrende Mahlzeitensituationen.",
  option2_opt_value_proposition: "Der Nutzen reduziert Zeit- und Entscheidungsaufwand statt primär sportliche Leistung zu versprechen.",
  option2_opt_positioning: "Die Positionierung nutzt einen breiten Nutzungskontext und mehrere bestehende Vergleichsangebote.",
  option2_opt_market_access: "Die Kanäle orientieren sich am Arbeitsalltag und könnten größere Nutzergruppen erreichen.",
  option2_opt_revenue_growth: "B2C und B2B2C können sich ergänzen und Akquisitionskosten reduzieren.",
  option3_opt_target_group: "Die Zielgruppe besitzt eine klare Ernährungspräferenz und identifizierbare Community-Touchpoints.",
  option3_opt_customer_problem: "Die vermutete Lücke schafft eine spezifische Positionierung jenseits der bloßen Vegan-Kennzeichnung.",
  option3_opt_value_proposition: "Die Kombination adressiert funktionale und wertbezogene Erwartungen des Segments.",
  option3_opt_positioning: "Die Positionierung verbindet Markenwerte mit funktionaler Produktqualität.",
  option3_opt_market_access: "Die Zielgruppe lässt sich thematisch klarer adressieren als breite Gesundheitssegmente.",
  option3_opt_revenue_growth: "Sortiments- und Community-Logik können Wiederkauf unterstützen.",
};
const optUnc = {
  option1_opt_target_group: "Segmentgröße und Kaufhäufigkeit sind ungeprüft.",
  option1_opt_customer_problem: "Die wahrgenommene Belastung und Wechselbereitschaft sind offen.",
  option1_opt_value_proposition: "Produktqualität, Portion und wahrgenommener Mehrwert müssen im Pilot bestätigt werden.",
  option1_opt_positioning: "Ob vegan als Haupt- oder Zusatzbotschaft wirken sollte, ist offen.",
  option1_opt_market_access: "Reichweite, Conversion und Kosten pro zahlendem Kunden sind ungeprüft.",
  option1_opt_revenue_growth: "Preis, Boxgröße, Versandkosten und Abonnementbereitschaft sind offen.",
  option2_opt_target_group: "Die Zielgruppe ist breit und schwerer effizient abzugrenzen.",
  option2_opt_customer_problem: "Die Zahlungsbereitschaft für eine geplante Lösung ist offen.",
  option2_opt_value_proposition: "Differenzierung gegenüber Kochboxen, Bowls und Lieferdiensten muss geschärft werden.",
  option2_opt_positioning: "Die Botschaft kann ohne starken Fokus austauschbar wirken.",
  option2_opt_market_access: "Zugang, Streuverluste und längere B2B-Entscheidungswege sind offen.",
  option2_opt_revenue_growth: "Partnerinteresse, administrative Komplexität und Nutzungshäufigkeit sind ungeprüft.",
  option3_opt_target_group: "Segmentgröße und regelmäßige Premiumbereitschaft sind offen.",
  option3_opt_customer_problem: "Die Unzufriedenheit mit Alternativen muss nachgewiesen werden.",
  option3_opt_value_proposition: "Der Mehrwert gegenüber Supermarkt- und Tiefkühlangeboten ist ungeprüft.",
  option3_opt_positioning: "Nachhaltigkeits- und Verpackungserwartungen können zusätzlichen Aufwand erzeugen.",
  option3_opt_market_access: "Thematische Reichweite kann schnell gesättigt und kostenintensiv werden.",
  option3_opt_revenue_growth: "Premiumpreis, Sortimentskomplexität und Wiederkaufsrhythmus sind offen.",
};
for (const [k, j] of Object.entries(optJust)) {
  statements[k].justification = j;
  statements[k].uncertainty = optUnc[k];
}

// --- Phase 5 LEARNING (4) ---
const learnRows = [
  ["p5_learn_01", "Der stärkste Nutzungskontext liegt an arbeits- und trainingsintensiven Wochentagen; Wochenenden werden deutlich häufiger durch eigenes Kochen abgedeckt.", "FACT", "Begründung: Interviews und Tagebücher zeigen wiederholt Nutzung von Montag bis Donnerstag.Unsicherheit: Saisonale und berufliche Schwankungen sind möglich."],
  ["p5_learn_02", "Protein, Geschmack und Zeitersparnis sind für die priorisierte Zielgruppe stärkere Erstkaufmotive als eine ausschließlich vegane Positionierung.", "FACT", "Begründung: Die Rangfolge zeigt sich konsistent in Interviews, Einwänden und Produktfeedback.Unsicherheit: Für streng vegan lebende Segmente kann die Gewichtung anders ausfallen."],
  ["p5_learn_03", "Ein Preis von 10,90 Euro je Mahlzeit ist bei inkludiertem Versand grundsätzlich tragfähig, bleibt aber eng mit Portion, Geschmackssicherheit und Boxgröße verknüpft.", "ASSUMPTION", "Begründung: Bezahlte Reservierungen stützen die Preislogik, die geringe Fallzahl begrenzt die Sicherheit.Unsicherheit: Wiederholte Käufe bei diesem Preis sind noch nicht ausreichend belegt."],
  ["p5_learn_04", "Flexible Wiederbestellung ohne langfristige Bindung wird deutlich eher akzeptiert als ein früh kommuniziertes Abonnement.", "ASSUMPTION", "Begründung: Mehrere Nichtkäufer lehnten Bindung, nicht aber das Produkt grundsätzlich ab.Unsicherheit: Eine spätere Abo-Option für Stammkunden bleibt möglich."],
];
for (const [key, content, ev, jus] of learnRows) {
  addStmt(key, { phase: 5, category: "LEARNING", content, evidenceStatus: ev, origin: "AI_DERIVATION", ...parseJUS(jus) });
}

// --- Options ---
const options = {
  option1: {
    key: "option1",
    title: "Performance ohne Meal Prep",
    summary: "Nouriva richtet das Angebot auf sportlich aktive Berufstätige aus, die Proteinziele und Ernährungsroutine ohne regelmäßiges Vorkochen einhalten möchten.",
    status: "PRIORITIZED",
    modeNote: "Marktbezogene Option mit ressourcenorientierter Pilotierung über vorhandene Fitnesskontakte.",
    diversityNote: "Differenziert sich über Performance-Nutzen, klaren Nutzungskontext und direkte Testbarkeit; Veganismus ist unterstützend, nicht alleiniger Kern.",
    prioritizationRationale: "Option 1 wird nicht als endgültig beste Strategie, sondern als zuerst zu validierende Stoßrichtung priorisiert. Sie verbindet die klarste Passung zwischen Produktmerkmal, Zielgruppenproblem und vorhandenen Kontaktmöglichkeiten. Ihre kritischen Annahmen lassen sich mit begrenztem Budget in einer logischen Sequenz aus Probleminterviews, verbindlichem Preis- und Vorbestelltest sowie Produktpilot prüfen. Gegenüber Option 2 ist die Positionierung fokussierter und der Marktzugang konkreter. Gegenüber Option 3 besitzt sie ein größeres potenzielles Segment und ist nicht ausschließlich an eine vegane Identität gebunden.",
    statementKeys: optDims.map((d) => `option1_opt_${d.replace("OPT_", "").toLowerCase()}`),
  },
  option2: {
    key: "option2",
    title: "Gesunde Routine trotz vollem Kalender",
    summary: "Nouriva adressiert beruflich stark beanspruchte Menschen, die ohne tägliche Planung und Kochaufwand verlässlich ausgewogen essen möchten.",
    status: "DEFERRED",
    modeNote: "Breiter marktbezogener Pfad mit potenziellen B2B2C-Kooperationen.",
    diversityNote: "Stärker auf allgemeine Gesundheits- und Zeitersparnisbedürfnisse ausgerichtet; Protein und vegan sind Qualitätsmerkmale statt Hauptidentität.",
    statementKeys: optDims.map((d) => `option2_opt_${d.replace("OPT_", "").toLowerCase()}`),
  },
  option3: {
    key: "option3",
    title: "Plant-based Premium Convenience",
    summary: "Nouriva fokussiert vegan und überwiegend pflanzlich lebende Käufer, die Convenience ohne Abstriche bei Protein, Sättigung, Zutaten und Markenwerten suchen.",
    status: "DEFERRED",
    modeNote: "Nischenorientierter Community-Pfad mit hoher Markenpassung.",
    diversityNote: "Stellt die vegane Rezeptur und Glaubwürdigkeit in den Vordergrund; Performance ist Qualitätsbeweis statt Hauptidentität.",
    statementKeys: optDims.map((d) => `option3_opt_${d.replace("OPT_", "").toLowerCase()}`),
  },
};

// --- Evaluations (18) ---
const evalScores = {
  option1: {
    ATTRACTIVENESS: [5, "Das Segment besitzt ein klar formuliertes, wiederkehrendes Problem und das High-Protein-Merkmal schafft eine verständliche Differenzierung. Marktgröße und Wiederkauf sind zwar offen, der Kundennutzen ist jedoch konkret."],
    RESOURCE_FIT: [4, "Vorhandene Fitnesskontakte, Content-Kompetenz und erste Rezepturen unterstützen einen fokussierten Pilot. Kühlversand und Produktion erfordern dennoch externe Unterstützung."],
    RISK: [3, "Produkt- und Logistiktests binden reale Mittel, können aber regional und mit kleinen Chargen begrenzt werden. Ein breiter Launch ist nicht erforderlich."],
    VALIDATION_EFFORT: [4, "Problemrelevanz, Zahlungsbereitschaft und Wiederkauf lassen sich in aufeinanderfolgenden Interviews, Vorbestellungen und einem kleinen Produktpilot direkt beobachten."],
    LEARNING_VALUE: [5, "Die Option testet zentrale Wert- und Wachstumshypothesen und liefert zugleich Erkenntnisse zu Preis, Produkt, Positionierung, Kanal und Wiederkauf."],
    EVIDENCE: [3, "Externe Trends und vorhandene Kontakte stützen die Plausibilität, aber Problemintensität, Preis und Wiederkauf sind noch nicht validiert."],
  },
  option2: {
    ATTRACTIVENESS: [5, "Der potenzielle Markt ist groß und Zeitknappheit ist ein verbreitetes Problem. Die Option besitzt jedoch weniger klare Abgrenzung gegenüber zahlreichen bestehenden Angeboten."],
    RESOURCE_FIT: [3, "Das Team kann D2C-Inhalte umsetzen, verfügt aber kaum über Arbeitgeber- oder Coworking-Zugänge. B2B2C-Partnerschaften verlängern den Marktzugang."],
    RISK: [3, "Breite Ansprache kann höhere Media-Ausgaben und Streuverluste verursachen; ein kleiner D2C-Test bleibt dennoch begrenzbar."],
    VALIDATION_EFFORT: [3, "Mehrere Nutzungssituationen und Alternativen erschweren eine fokussierte Prüfung. Partnerkanäle benötigen zusätzliche Abstimmung."],
    LEARNING_VALUE: [4, "Die Option liefert Erkenntnisse zu breitem Convenience-Bedarf, Arbeitgeberzugang und allgemeiner Gesundheitspositionierung, aber weniger klare Signale pro Einzelannahme."],
    EVIDENCE: [2, "Die Zielgruppe ist breit und bisher nur aus externen Trends sowie allgemeinen Annahmen abgeleitet. Direkte Kontakte und segmentbezogene Erkenntnisse fehlen."],
  },
  option3: {
    ATTRACTIVENESS: [3, "Das Segment hat klare Bedürfnisse und Community-Strukturen, ist aber vermutlich kleiner und besitzt viele spezialisierte Alternativen."],
    RESOURCE_FIT: [4, "Vegane Rezepturen, Markenkompetenz und Community-Content passen gut zum Team. Nachhaltigkeits- und Verpackungserwartungen erhöhen den Aufwand."],
    RISK: [4, "Ein Community- und Creator-Test kann klein starten; das Risiko liegt eher in begrenzter Marktgröße und Premiumpreis als in hohen Anfangsinvestitionen."],
    VALIDATION_EFFORT: [4, "Zielgruppen lassen sich über spezialisierte Communities gut rekrutieren. Zahlungsbereitschaft und Angebotslücke können gezielt getestet werden."],
    LEARNING_VALUE: [4, "Die Option liefert klare Erkenntnisse zur Rolle von vegan, Protein, Zutaten und Nachhaltigkeit, beantwortet aber weniger über den breiteren Markt."],
    EVIDENCE: [3, "Plant-based-Trends und identifizierbare Alternativen stützen die Plausibilität; konkrete Unzufriedenheit und Premiumbereitschaft bleiben Annahmen."],
  },
};
const evaluations = {};
for (const [optKey, criteria] of Object.entries(evalScores)) {
  for (const [criterion, [score, rationale]] of Object.entries(criteria)) {
    const key = `${optKey}_eval_${criterion.toLowerCase()}`;
    evaluations[key] = { key, optionKey: optKey, criterion, score, rationale };
  }
}

// --- Validation steps ---
const validationSteps = {
  step1: {
    key: "step1",
    optionKey: "option1",
    assumptionKey: "option1_opt_customer_problem",
    title: "Problem- und Nutzeninterviews",
    description: "18 leitfadengestützte Interviews mit berufstätigen Personen, die mindestens dreimal pro Woche trainieren, um Meal-Prep-Aufwand und Nutzenrelevanz zu prüfen.",
    validationQuestion: "Beschreiben qualifizierte Zielpersonen den Meal-Prep-Aufwand eigenständig als wiederkehrendes Problem und benennen sie konkrete Situationen, in denen Nouriva eine bestehende Lösung ersetzen würde?",
    testDesign: "18 leitfadengestützte Interviews mit berufstätigen Personen, die mindestens dreimal pro Woche trainieren. Zuerst offene Problemexploration ohne Produktnennung, danach Vergleich eines neutralen Nouriva-Konzepts mit Meal Prep, Supermarkt-Convenience und Lieferdienst.",
    marketingActivities: [
      "Screening-Fragen definieren und nur regelmäßig trainierende Berufstätige mit eigener Ernährungsorganisation zulassen.",
      "Interviewleitfaden mit offener Problemphase, Alternativenvergleich und neutralem Konzeptstimulus erstellen.",
      "Je sechs Personen über Fitnessstudio, Trainer und lokale Sport-Community rekrutieren.",
      "18 Interviews durchführen, Aussagen wörtlich dokumentieren und keine Preisfrage vor der Problemexploration stellen.",
      "Problemstärke, bestehende Alternativen, Nutzungssituationen und Kaufmotive in einem einheitlichen Kodierschema auswerten.",
      "Ergebniszusammenfassung mit stützenden, widersprechenden und mehrdeutigen Mustern erstellen.",
    ],
    channel: "Direkte Rekrutierung über Fitnessstudios, Trainer und Sport-Community",
    timeframe: "2 Wochen",
    budgetFrame: "ca. 600 Euro inklusive Incentives und Testmaterialien",
    stepType: "VALIDATION",
    strategyDimension: "CUSTOMER_PROBLEM",
    testSubject: "PROBLEM_RELEVANCE",
    adopted: true,
    laufmodus: "EIGENSTAENDIG",
    metricKeys: ["step1_metric_1", "step1_metric_2", "step1_metric_3"],
    taskKeys: ["step1_task_1", "step1_task_2", "step1_task_3", "step1_task_4", "step1_task_5", "step1_task_6"],
  },
  step2: {
    key: "step2",
    optionKey: "option1",
    assumptionKey: "option1_opt_revenue_growth",
    title: "Verbindlicher Preis- und Vorbestelltest",
    description: "Zwei Landingpage-Varianten mit rückerstattbarer Reservierungszahlung für eine 10er-Pilotbox zu 9,90 bzw. 10,90 Euro je Mahlzeit.",
    validationQuestion: "Leisten qualifizierte Interessenten bei einem realistischen Angebot eine rückerstattbare Reservierungszahlung für eine 10er-Box zu 10,90 Euro je Mahlzeit?",
    testDesign: "Zwei inhaltlich identische Landingpages mit einer 10er-Pilotbox, Versand inklusive und rückerstattbarer Reservierung von 10 Euro. Variante A zeigt 9,90 Euro, Variante B 10,90 Euro je Mahlzeit. Je Variante werden mindestens 60 qualifizierte Besuche aus denselben Zielgruppenquellen angestrebt.",
    marketingActivities: [
      "Produktumfang, Liefergebiet, Lieferfenster, Rückerstattung und Preis transparent definieren.",
      "Zwei identische Landingpages erstellen, die sich ausschließlich im Preis unterscheiden.",
      "Checkout mit realer, rückerstattbarer 10-Euro-Reservierung und Einwilligung zur Pilotkontaktaufnahme einrichten.",
      "Traffic aus denselben Studios, Communities und Anzeigenmotiven gleichmäßig auf beide Varianten verteilen.",
      "Abbrüche und Preisfragen nach dem Test durch kurze freiwillige Nachbefragung ergänzen.",
      "Reservierungsdaten, qualifizierte Besuche, Abbruchpunkte und qualitative Einwände getrennt auswerten.",
    ],
    channel: "Zwei Landingpage-Varianten, lokale Partner, E-Mail und gezielte Social Ads",
    timeframe: "3 Wochen",
    budgetFrame: "ca. 1.400 Euro inklusive Media, Landingpages und Zahlungsabwicklung",
    stepType: "VALIDATION",
    strategyDimension: "REVENUE_GROWTH",
    testSubject: "WILLINGNESS_TO_PAY",
    adopted: true,
    laufmodus: "NACHGELAGERT",
    basiertAufUmsetzungKey: "step1",
    metricKeys: ["step2_metric_1", "step2_metric_2", "step2_metric_3"],
    taskKeys: ["step2_task_1", "step2_task_2", "step2_task_3", "step2_task_4", "step2_task_5", "step2_task_6"],
  },
  step3: {
    key: "step3",
    optionKey: "option1",
    assumptionKey: "option1_opt_value_proposition",
    title: "Produktpilot und tatsächlicher Wiederkauf",
    description: "Bezahlter regionaler Produktpilot mit 30 Kunden und Wiederkaufsfenster von 21 Tagen.",
    validationQuestion: "Bestellen mindestens 30 Prozent der zahlenden Pilotkunden innerhalb von 21 Tagen erneut, wenn Geschmack, Produktqualität und Lieferung den angekündigten Standard erfüllen?",
    testDesign: "30 zahlende Kunden erhalten eine 6er-Pilotbox. Verbrauch, Geschmack, Nutzungssituation, Lieferqualität und Einwände werden über kurze Mahlzeitentagebücher erfasst. Nach sieben Tagen wird eine reguläre 10er-Box ohne Abozwang und ohne starken Preisrabatt angeboten.",
    marketingActivities: [
      "Pilotrezepte final auswählen und je Gericht Proteingehalt, Zutaten, Allergene und Erwärmungshinweise prüfen.",
      "Produktion, Verpackung und gekühlten Versand zunächst mit internen Testsendungen absichern.",
      "30 zahlende Pilotkunden aus den Reservierungen auswählen und Lieferfenster verbindlich bestätigen.",
      "Kurzes digitales Mahlzeitentagebuch für Geschmack, Sättigung, Nutzungssituation und Qualitätsprobleme bereitstellen.",
      "Nach sieben Tagen eine regulär bepreiste 10er-Box mit flexibler Wiederbestellung anbieten.",
      "Tatsächliche Wiederkäufe, verbrauchte Mahlzeiten, Lieferqualität und Nichtkaufgründe gemeinsam interpretieren.",
    ],
    channel: "Bezahlter regionaler Produktpilot mit 30 Kunden",
    timeframe: "5 Wochen inklusive Wiederkaufsfenster",
    budgetFrame: "ca. 2.400 Euro für Produktion, Verpackung, Versand, Support und Auswertung",
    stepType: "VALIDATION",
    strategyDimension: "VALUE_PROPOSITION",
    testSubject: "VALUE_UNDERSTANDING",
    adopted: true,
    laufmodus: "NACHGELAGERT",
    basiertAufUmsetzungKey: "step2",
    metricKeys: ["step3_metric_1", "step3_metric_2", "step3_metric_3"],
    taskKeys: ["step3_task_1", "step3_task_2", "step3_task_3", "step3_task_4", "step3_task_5", "step3_task_6"],
  },
};

// --- Metrics (9) ---
const metrics = {
  step1_metric_1: { key: "step1_metric_1", stepKey: "step1", name: "Befragte mit eigenständig genanntem wiederkehrendem Meal-Prep-Problem", evaluationMode: "CUMULATIVE", valueType: "COUNT_OF_TOTAL", aggregationStrategy: "RATE_FROM_SUMS", evaluationConfig: { kind: "COUNT_OF_TOTAL", requiredDenominator: 18, success: { operator: "GTE", numerator: 12 }, failure: { operator: "LTE", numerator: 7 } }, numeratorLabel: "Befragte mit relevantem Problem", denominatorLabel: "Befragte insgesamt", observationUnit: "Befragten", metricRole: "DECISIVE", signalCategory: "QUALITATIVE", proxyStrength: "DIRECT", successCriterion: "Mindestens 12 von 18 nennen ohne Vorgabe einen wiederkehrenden relevanten Aufwand.", failureCriterion: "Höchstens 7 von 18 nennen einen relevanten Aufwand.", kpiPointKeys: ["kpi_step1_m1_p1", "kpi_step1_m1_p2", "kpi_step1_m1_p3"] },
  step1_metric_2: { key: "step1_metric_2", stepKey: "step1", name: "Befragte mit konkretem Ersatz-Nutzungskontext für Nouriva", evaluationMode: "CUMULATIVE", valueType: "COUNT_OF_TOTAL", aggregationStrategy: "LATEST", evaluationConfig: { kind: "COUNT_OF_TOTAL", requiredDenominator: 18, success: { operator: "GTE", numerator: 10 }, failure: { operator: "LTE", numerator: 5 } }, observationUnit: "Befragten", metricRole: "DECISIVE", signalCategory: "QUALITATIVE", proxyStrength: "DIRECT", successCriterion: "Mindestens 10 von 18 nennen eine konkrete wöchentliche Nutzungssituation.", failureCriterion: "Höchstens 5 von 18 nennen einen konkreten Ersatzkontext.", kpiPointKeys: ["kpi_step1_m2_p1"] },
  step1_metric_3: { key: "step1_metric_3", stepKey: "step1", name: "Dominante Kaufmotive und Einwände", evaluationMode: "CUMULATIVE", valueType: "SCALAR", aggregationStrategy: "NONE", metricRole: "SUPPORTING", signalCategory: "QUALITATIVE", proxyStrength: "DIRECT", successCriterion: "Klare Rangfolge aus Protein, Geschmack, Zeitersparnis, Vegan und Preis erkennbar.", failureCriterion: "Motive bleiben stark fragmentiert und ohne gemeinsames Muster.", kpiPointKeys: [] },
  step2_metric_1: { key: "step2_metric_1", stepKey: "step2", name: "Bezahlte Reservierungsrate bei 10,90 Euro je Mahlzeit", evaluationMode: "PER_POINT", valueType: "PERCENTAGE", aggregationStrategy: "NONE", evaluationConfig: { kind: "PERCENTAGE", success: { operator: "GTE", percentage: 10 }, failure: { operator: "LT", percentage: 5 } }, metricRole: "DECISIVE", signalCategory: "COMMITMENT", proxyStrength: "DIRECT", successCriterion: "Mindestens 10 Prozent der qualifizierten Besucher leisten die Reservierung.", failureCriterion: "Weniger als 5 Prozent leisten die Reservierung.", kpiPointKeys: ["kpi_step2_m1_p1"] },
  step2_metric_2: { key: "step2_metric_2", stepKey: "step2", name: "Differenz der Reservierungsraten 9,90 vs. 10,90 Euro", evaluationMode: "PER_POINT", valueType: "PERCENTAGE", aggregationStrategy: "LATEST", evaluationConfig: { kind: "PERCENTAGE", success: { operator: "LTE", percentage: 4 }, failure: { operator: "GT", percentage: 6 } }, metricRole: "DECISIVE", signalCategory: "COMMITMENT", proxyStrength: "DIRECT", successCriterion: "Die 10,90-Euro-Variante liegt höchstens vier Prozentpunkte unter 9,90 Euro.", failureCriterion: "Die Differenz beträgt mehr als sechs Prozentpunkte.", kpiPointKeys: ["kpi_step2_m2_p1"] },
  step2_metric_3: { key: "step2_metric_3", stepKey: "step2", name: "Anteil preisbezogener Einwände in der Nachbefragung", evaluationMode: "CUMULATIVE", valueType: "COUNT_OF_TOTAL", aggregationStrategy: "LATEST", observationUnit: "Nachbefragten", metricRole: "SUPPORTING", signalCategory: "QUALITATIVE", proxyStrength: "DIRECT", successCriterion: "Preis ist nicht der dominante Ablehnungsgrund oder wird mit klaren Bedingungen verknüpft.", failureCriterion: "Mehrheit nennt Preis ohne kompensierenden Nutzen als Hauptablehnung.", kpiPointKeys: ["kpi_step2_m3_p1"] },
  step3_metric_1: { key: "step3_metric_1", stepKey: "step3", name: "Tatsächliche Wiederkaufsrate innerhalb von 21 Tagen", evaluationMode: "CUMULATIVE", valueType: "COUNT_OF_TOTAL", aggregationStrategy: "LATEST", evaluationConfig: { kind: "COUNT_OF_TOTAL", requiredDenominator: 30, success: { operator: "GTE", numerator: 9 }, failure: { operator: "LTE", numerator: 4 } }, observationUnit: "Kunden", metricRole: "DECISIVE", signalCategory: "BEHAVIOR", proxyStrength: "DIRECT", successCriterion: "Mindestens 9 von 30 Kunden bestellen erneut.", failureCriterion: "Höchstens 4 von 30 bestellen erneut.", kpiPointKeys: ["kpi_step3_m1_p1", "kpi_step3_m1_p2"] },
  step3_metric_2: { key: "step3_metric_2", stepKey: "step3", name: "Anteil Kunden mit Verbrauch von mindestens fünf der sechs Mahlzeiten", evaluationMode: "CUMULATIVE", valueType: "COUNT_OF_TOTAL", aggregationStrategy: "LATEST", evaluationConfig: { kind: "COUNT_OF_TOTAL", requiredDenominator: 30, success: { operator: "GTE", numerator: 24 }, failure: { operator: "LT", numerator: 18 } }, observationUnit: "Kunden", metricRole: "SUPPORTING", signalCategory: "BEHAVIOR", proxyStrength: "DIRECT", successCriterion: "Mindestens 24 von 30 verbrauchen mindestens fünf Mahlzeiten.", failureCriterion: "Weniger als 18 von 30 erreichen diesen Wert.", kpiPointKeys: ["kpi_step3_m2_p1"] },
  step3_metric_3: { key: "step3_metric_3", stepKey: "step3", name: "Nichtkaufgründe bei ausbleibendem Wiederkauf", evaluationMode: "CUMULATIVE", valueType: "COUNT_OF_TOTAL", aggregationStrategy: "LATEST", observationUnit: "Kunden", metricRole: "SUPPORTING", signalCategory: "QUALITATIVE", proxyStrength: "DIRECT", successCriterion: "Gründe lassen sich klar Preis, Geschmack, Menge, Lieferung oder fehlendem Bedarf zuordnen.", failureCriterion: "Qualitätsfehler dominieren und verhindern eine faire Strategiebewertung.", kpiPointKeys: ["kpi_step3_m3_p1"] },
};

// --- Tasks (18) ---
const taskRows = [
  ["step1", 1, "Zielgruppenscreener finalisieren", "Kriterien zu Berufstätigkeit, Trainingsfrequenz, Ernährungsorganisation und Region festlegen.", "Nur qualifizierte Personen werden eingeladen.", true],
  ["step1", 2, "Interviewleitfaden und Stimulus erstellen", "Offene Problemfragen vor Produktdarstellung; neutraler Vergleich zu Alternativen.", "Leitfaden deckt Problem, Verhalten, Kontext, Motive und Einwände ab.", true],
  ["step1", 3, "18 Teilnehmer rekrutieren", "Je sechs über Studio, Trainer und Sport-Community gewinnen.", "18 bestätigte Termine mit ausgewogener Geschlechterverteilung.", true],
  ["step1", 4, "Interviews durchführen und dokumentieren", "30–40 Minuten je Gespräch, Kernaussagen wörtlich erfassen.", "Alle 18 Interviews vollständig dokumentiert.", true],
  ["step1", 5, "Aussagen kodieren", "Einheitliches Schema für Problemstärke, Nutzungssituation, Motive und Einwände anwenden.", "Jedes Interview ist nachvollziehbar kategorisiert.", true],
  ["step1", 6, "Ergebnisbericht erstellen", "Stützende, widersprechende und mehrdeutige Muster zusammenführen.", "Entscheidende Metriken und Unsicherheiten sind dokumentiert.", true],
  ["step2", 1, "Pilotangebot verbindlich definieren", "Gerichte, Boxumfang, Liefergebiet, Liefertermin, Preis und Rückerstattung festlegen.", "Beide Varianten unterscheiden sich ausschließlich im Preis.", true],
  ["step2", 2, "Zwei Landingpages und Checkout umsetzen", "Variante 9,90 und 10,90 Euro mit realer 10-Euro-Reservierung erstellen.", "Testzahlung funktioniert auf Desktop und mobil.", true],
  ["step2", 3, "Werbemittel und Partnertexte vorbereiten", "Drei Anzeigenmotive und kurze Partnernachrichten ohne wechselnde Preisargumente erstellen.", "Beide Varianten erhalten identische Botschaft und Visuals.", true],
  ["step2", 4, "Traffic kontrolliert ausspielen", "Zielgruppenquellen gleichmäßig verteilen und qualifizierte Besuche prüfen.", "Mindestens 60 qualifizierte Besuche je Variante.", true],
  ["step2", 5, "Abbrüche nachbefragen", "Freiwillige Ein-Frage-Nachbefragung zu Preis, Produkt und Liefermodell anbieten.", "Mindestens 20 verwertbare Antworten.", false],
  ["step2", 6, "Reservierungsdaten auswerten", "Raten, Differenz, Abbruchpunkte und Einwände getrennt berechnen.", "Entscheidende Schwellenwerte sind eindeutig bewertet.", false],
  ["step3", 1, "Pilotrezepte und Kennzeichnung freigeben", "Sechs Gerichte auswählen und Nährwerte, Zutaten, Allergene sowie Zubereitung prüfen.", "Alle Produktinformationen sind konsistent dokumentiert.", true],
  ["step3", 2, "Verpackungs- und Versandtest durchführen", "Mindestens fünf interne Testsendungen mit Temperatur- und Zustellprüfung.", "Mindestens vier Sendungen erreichen Qualitätsziel ohne kritische Abweichung.", true],
  ["step3", 3, "30 Pilotkunden onboarden", "Lieferfenster, Lagerung, Tagebuch und Support erklären.", "30 zahlende Teilnehmer bestätigen Zustellung.", true],
  ["step3", 4, "Mahlzeitentagebuch begleiten", "Erinnerungen nach Nutzung ausspielen und Qualitätsprobleme zeitnah bearbeiten.", "Mindestens 24 Teilnehmer dokumentieren fünf Mahlzeiten.", false],
  ["step3", 5, "Wiederbestellangebot versenden", "Nach sieben Tagen 10er-Box ohne Abozwang und starken Rabatt anbieten.", "Alle qualifizierten Teilnehmer erhalten dasselbe Angebot.", false],
  ["step3", 6, "Wiederkauf und Lernpunkte auswerten", "Bestellungen, Verbrauch, Qualität und Nichtkaufgründe gemeinsam analysieren.", "Evidenzstatus und Anpassungsentscheidung sind begründet.", false],
];
const landingElaboration = {
  einleitungssatz: "Die beiden Seiten müssen bis auf den Preis vollständig identisch sein, damit die Reservierungsdifferenz möglichst eindeutig auf die Preisvariation zurückgeführt werden kann.",
  schritte: [
    { titel: "Gemeinsame Seitenstruktur erstellen", beschreibung: "Gemeinsame Seitenstruktur mit Nutzenversprechen, sechs Beispielgerichten, Liefergebiet, Liefertermin, FAQ und Rückerstattungsregel erstellen." },
    { titel: "Preisvarianten anlegen", beschreibung: "Variante A mit 9,90 Euro und Variante B mit 10,90 Euro je Mahlzeit anlegen; beide zeigen eine 10er-Box und inkludierten Versand." },
    { titel: "Checkout konfigurieren", beschreibung: "Checkout mit realer 10-Euro-Reservierung, Bestätigungsseite und automatischer E-Mail konfigurieren." },
    { titel: "Tracking einrichten", beschreibung: "Tracking für qualifizierten Besuch, Checkout-Start, Zahlung und Abbruch einrichten." },
    { titel: "Technische Tests durchführen", beschreibung: "Desktop- und Mobile-Test einschließlich fehlgeschlagener Zahlung und Rückerstattung durchführen." },
  ],
  targeting: {
    vorhanden: true,
    spezifikation: {
      zielgruppenbeschreibung: "Berufstätige im Rhein-Ruhr-Gebiet, 25–39 Jahre, mindestens drei Trainingseinheiten pro Woche, Interesse an Meal Prep, Fitnessernährung oder High-Protein-Rezepten.",
      demografie: "25–39 Jahre, berufstätig, regelmäßig sportlich aktiv",
      geografie: "Pilotmarkt Düsseldorf, Köln und Rhein-Ruhr",
      interessen: ["Meal Prep", "Fitnessernährung", "High-Protein-Rezepte", "vegane Ernährung"],
      platzierung: "Trafficquellen werden zwischen beiden Varianten gleich verteilt (Fitnessstudios, Trainer, Sport-Community, Social Ads, E-Mail).",
    },
    basiertAufAussageIds: ["option1_opt_target_group", "option1_opt_market_access"],
    hinweis: "Targeting basiert auf der priorisierten Option 1 und dem regionalen Pilotmarkt.",
  },
  formulierungsvorschlaege: [
    "Headline: 30+ g Protein. In 4 Minuten auf dem Tisch.",
    "Subline: Sechs vegane High-Protein-Gerichte für volle Arbeits- und Trainingstage – fertig gekocht, gekühlt geliefert.",
    "CTA: Pilotbox mit 10 € reservieren",
    "Vertrauenshinweis: Begrenzter regionaler Pilot. Die Reservierung wird bei Nichtdurchführung vollständig erstattet.",
  ],
  erfolgskriterium: "Beide Varianten sind technisch identisch, Zahlungen funktionieren, die Preisvariation ist die einzige relevante Abweichung und alle Events werden korrekt erfasst.",
  benoetigteRessourcen: {
    zeitaufwandGeschaetzt: "2–3 Tage für Umsetzung und Tests",
    tools: ["Website-Builder", "Zahlungsanbieter", "Analytics-Tracking"],
    budgetanteil: "Teil des Schritt-2-Budgets von ca. 1.400 Euro",
  },
  offeneFragen: [
    "Welche Zahlungsmethode minimiert Abbrüche bei der Reservierung?",
    "Sollen beide Varianten unter derselben URL mit Randomisierung oder unter getrennten URLs laufen?",
  ],
};
const tasks = {};
for (const [stepKey, sortOrder, title, hint, erfolgskriterium, done] of taskRows) {
  const key = `${stepKey}_task_${sortOrder}`;
  const task = { key, stepKey, title, hint, sortOrder, done, erfolgskriterium, herkunft: "NEU" };
  if (key === "step2_task_2") task.elaboration = landingElaboration;
  if (stepKey === "step1") task.annahmenBezugKey = "option1_opt_customer_problem";
  if (stepKey === "step2") task.annahmenBezugKey = "option1_opt_revenue_growth";
  if (stepKey === "step3") task.annahmenBezugKey = "option1_opt_value_proposition";
  tasks[key] = task;
}

// --- KPI points (12) ---
const kpiPoints = {
  kpi_step1_m1_p1: { key: "kpi_step1_m1_p1", metricKey: "step1_metric_1", periodLabel: "Welle 1", numerator: 4, denominator: 6, assessment: "PENDING" },
  kpi_step1_m1_p2: { key: "kpi_step1_m1_p2", metricKey: "step1_metric_1", periodLabel: "Welle 2", numerator: 4, denominator: 6, assessment: "PENDING" },
  kpi_step1_m1_p3: { key: "kpi_step1_m1_p3", metricKey: "step1_metric_1", periodLabel: "Welle 3", numerator: 6, denominator: 6, assessment: "SUPPORTING" },
  kpi_step1_m2_p1: { key: "kpi_step1_m2_p1", metricKey: "step1_metric_2", periodLabel: "nach 18 Interviews", numerator: 11, denominator: 18, assessment: "SUPPORTING" },
  kpi_step2_m1_p1: { key: "kpi_step2_m1_p1", metricKey: "step2_metric_1", periodLabel: "Testende", value: "10", assessment: "SUPPORTING" },
  kpi_step2_m2_p1: { key: "kpi_step2_m2_p1", metricKey: "step2_metric_2", periodLabel: "Testende", value: "3.3", assessment: "SUPPORTING" },
  kpi_step2_m3_p1: { key: "kpi_step2_m3_p1", metricKey: "step2_metric_3", periodLabel: "22 Nachbefragungen", numerator: 7, denominator: 22, assessment: "NEUTRAL" },
  kpi_step3_m1_p1: { key: "kpi_step3_m1_p1", metricKey: "step3_metric_1", periodLabel: "Tag 14", numerator: 5, denominator: 30, assessment: "NEUTRAL" },
  kpi_step3_m1_p2: { key: "kpi_step3_m1_p2", metricKey: "step3_metric_1", periodLabel: "Tag 21", numerator: 8, denominator: 30, assessment: "NEUTRAL" },
  kpi_step3_m2_p1: { key: "kpi_step3_m2_p1", metricKey: "step3_metric_2", periodLabel: "Ende Woche 1", numerator: 25, denominator: 30, assessment: "SUPPORTING" },
  kpi_step3_m3_p1: { key: "kpi_step3_m3_p1", metricKey: "step3_metric_3", periodLabel: "Gesamtpilot", numerator: 2, denominator: 30, assessment: "NEUTRAL" },
};
// Additional KPI for 9.90 variant from master
kpiPoints.kpi_step2_m1_p0 = { key: "kpi_step2_m1_p0", metricKey: "step2_metric_1", periodLabel: "Reservierungsrate 9,90 Euro", value: "13.3", assessment: "SUPPORTING" };
metrics.step2_metric_1.kpiPointKeys.unshift("kpi_step2_m1_p0");

// --- Feedbacks (3) ---
const feedbacks = {
  feedback_step1: {
    key: "feedback_step1",
    stepKey: "step1",
    statementKey: "option1_opt_customer_problem",
    content: "14 von 18 Befragten (77,8 %) nannten ohne Vorgabe einen wiederkehrenden relevanten Meal-Prep-Aufwand. Damit wurde der festgelegte Schwellenwert von mindestens 12 von 18 erreicht. Die Messgröße stützt die Teilannahme zur Problemrelevanz; die Gesamtannahme wird aus allen entscheidenden Messgrößen und qualitativen Befunden bewertet.",
    result: "SUPPORTED",
    interpretation: "Die Problemannahme wird für das untersuchte Segment deutlich gestützt. Der Nutzen entsteht primär aus Alltagserleichterung und verlässlichem Protein; die vegane Rezeptur wirkt überwiegend als positives Zusatzmerkmal. Die Stichprobe ist regional und fitnessnah.",
    proposedNewStatus: "FACT",
    statusApplied: true,
  },
  feedback_step2: {
    key: "feedback_step2",
    stepKey: "step2",
    statementKey: "option1_opt_revenue_growth",
    content: "Bei 60 qualifizierten Besuchen reservierten sechs Personen die 10,90-Euro-Variante und acht Personen die 9,90-Euro-Variante. Die Differenz betrug 3,3 Prozentpunkte. Preis war relevant, wurde aber häufig gemeinsam mit Versand, Portionsgröße und Geschmacksunsicherheit genannt.",
    result: "PARTIALLY_SUPPORTED",
    interpretation: "Eine verbindliche Nachfrage bei 10,90 Euro ist vorhanden und die Erfolgsschwelle wurde knapp erreicht. Die geringe Fallzahl und die Kombination aus Preis, Versand und unbekanntem Geschmack verhindern jedoch eine Einstufung als gesicherter Fakt. Größere Boxen mit inkludiertem Versand erscheinen plausibel.",
    proposedNewStatus: "ASSUMPTION",
    statusApplied: true,
  },
  feedback_step3: {
    key: "feedback_step3",
    stepKey: "step3",
    statementKey: "option1_opt_value_proposition",
    content: "25 von 30 Kunden verbrauchten mindestens fünf Mahlzeiten. Acht Kunden bestellten innerhalb von 21 Tagen erneut; fünf weitere nannten konkrete spätere Kaufabsicht, lehnten aber ein Abonnement ab. Häufigste Nichtkaufgründe waren Preis, zu große Mindestmenge und Wunsch nach flexiblerer Zusammenstellung.",
    result: "PARTIALLY_SUPPORTED",
    interpretation: "Der Produktnutzen und tatsächliche Konsum werden gestützt, die definierte Wiederkaufsquote von 30 Prozent wird knapp verfehlt. Flexible Wiederbestellung ist deutlich attraktiver als eine frühe Abo-Bindung. Preis- und Boxarchitektur sollten angepasst und erneut getestet werden.",
    proposedNewStatus: "ASSUMPTION",
    statusApplied: true,
  },
};

const adaptation = {
  optionKey: "option1",
  decision: "ADAPT",
  rationale: "Die Zielgruppe und das Grundproblem werden bestätigt, während Preisarchitektur, Boxgröße, Botschaft und Bindungslogik angepasst werden müssen. Die Option wird nicht verworfen, sondern als präzisierter Strategierahmen in Phase 2 zurückgeführt. Zielgruppenpräzisierung: Aktive Berufstätige zwischen 27 und 39 Jahren mit mindestens drei Trainingseinheiten pro Woche und wiederkehrendem Meal-Prep-Problem an Werktagen. Angepasstes Nutzenversprechen: 30+ Gramm Protein, überzeugender Geschmack und eine verlässliche Mahlzeit für volle Arbeits- und Trainingstage; vegan bleibt sichtbarer Qualitäts- und Markenbestandteil, aber nicht alleinige Leitbotschaft. Angepasste Preislogik: 6er-Testbox zu höherem Stückpreis; 10er-Box bei etwa 10,49–10,90 Euro je Mahlzeit inklusive Versand; flexible Wiederbestellung statt Abo-Pflicht. Angepasster Marktzugang: Fitnessstudio- und Trainerpartnerschaften priorisieren; Social Ads dienen ergänzend der Skalierung und nicht als alleiniger Nachweis von Nachfrage. Nächste Validierung: Erneuter 10er-Box-Test mit flexibler Zusammenstellung und Wiederbestell-Erinnerung; parallel Partnerkanal-Kosten und echte Neukundenakquisition messen.",
  userConfirmed: true,
  loopBackToPhase: 2,
};

const project = {
  name: "Nouriva Meals – Vegane High-Protein-Fertigmahlzeiten",
  slug: "nouriva-meals",
  currentPhase: 5,
  profileOnboardingComplete: true,
  profileOnboardingStep: 12,
  businessIdea: "Nouriva Meals entwickelt vollständig zubereitete vegane High-Protein-Mahlzeiten. Die Gerichte werden über einen eigenen Online-Store in Mehrfachboxen bestellt, gekühlt nach Hause geliefert und vor dem Verzehr lediglich erwärmt.",
  productStatus: "MVP / Pilotvorbereitung. Erste Rezepturen, Nährwertberechnungen und ein vorläufiges Verpackungs- und Markenkonzept bestehen; ein regulärer Lieferbetrieb ist noch nicht etabliert.",
  assumedTarget: "Gesundheits- und fitnessorientierte Berufstätige zwischen etwa 25 und 39 Jahren, die auf Protein und Nährwerte achten, im Alltag aber wenig Zeit für Planung, Einkauf und Kochen haben.",
  assumedProblem: "Eine ausgewogene und proteinreiche Ernährung ist im Arbeitsalltag mit wiederkehrendem Planungs-, Einkaufs- und Kochaufwand verbunden. Viele Alternativen bieten zu wenig Protein, unklare Nährwerte, geringe Abwechslung oder keine attraktive vegane Auswahl.",
  valuePropDraft: "Fertig zubereitete vegane Mahlzeiten mit hohem Proteingehalt, transparenten Nährwerten und abwechslungsreichen Rezepten ermöglichen eine planbare, gesunde Ernährung ohne regelmäßiges Vorkochen.",
  revenueIdea: "Sechs-, Zehn- und Vierzehn-Gerichte-Boxen; Einzelbestellungen bleiben möglich. Ergänzend wird eine flexibel pausierbare Wiederbestellung ohne langfristige Bindung geprüft.",
  region: "Pilotmarkt Düsseldorf, Köln und Rhein-Ruhr; nach erfolgreicher Validierung schrittweise Expansion in weitere deutsche Großstädte.",
  teamSize: 3,
  budgetMonthly: "Rund 5.000 Euro monatlich für Pilotierung und frühe Validierung; größere Produktions- und Kampagnenbudgets erst nach belastbaren Marktrückmeldungen.",
  timePerWeek: "Zusammen rund 30 Stunden pro Woche für Kundenforschung, Marketingtests, Vertriebsvorbereitung und Auswertung.",
  skills: "Rezept- und Produktentwicklung, Grundlagen Ernährungswissenschaft, Markenentwicklung, Content-Produktion, Social-Media-Marketing und grundlegende E-Commerce-Erfahrung.",
  existingInsights: "Informelle Verkostungen im persönlichen und sportlichen Umfeld zeigen positives Interesse an Geschmack, Convenience und Proteingehalt. Belastbare Erkenntnisse zu Zahlungsbereitschaft, Wiederkauf, Boxgrößen und Akquisitionskosten fehlen.",
  pestelRelevance: [
    { category: "PESTEL_POLITICAL", relevant: false, relevanceJustification: "Kein hinreichend direkter Einfluss auf die frühe Validierung von Zielgruppe, Kundennutzen und Zahlungsbereitschaft." },
    { category: "PESTEL_ECONOMIC", relevant: true, relevanceJustification: "Kaufkraft, Preissensibilität sowie Kostenentwicklungen bei Lebensmitteln, Energie, Verpackung und Logistik wirken unmittelbar auf Nachfrage und Tragfähigkeit." },
    { category: "PESTEL_SOCIAL", relevant: true, relevanceJustification: "Gesundheitsorientierung, Proteinbewusstsein, pflanzliche Ernährung, Zeitmangel und Convenience-Verhalten prägen den möglichen Bedarf." },
    { category: "PESTEL_TECHNOLOGICAL", relevant: true, relevanceJustification: "D2C-Commerce, Kühlversand, Sendungsverfolgung und digitale Bestellprozesse sind zentrale Leistungsvoraussetzungen." },
    { category: "PESTEL_ECOLOGICAL", relevant: true, relevanceJustification: "Verpackung, gekühlte Zustellung, Lebensmittelverluste und Nachhaltigkeit beeinflussen Marktanforderungen und Markenwahrnehmung." },
    { category: "PESTEL_LEGAL", relevant: true, relevanceJustification: "Kennzeichnung, Claims, Hygiene, Kühlkette, Rückverfolgbarkeit und Verpackungspflichten setzen verbindliche Rahmenbedingungen." },
  ],
  phase2Inputs: {
    p2_ausschluss: "Kein verpflichtendes Langzeitabonnement, kein bundesweiter Launch vor regionalem Logistiktest, keine Preispositionierung unterhalb der realistischen Vollkosten.",
    p2_kernangebot: { mode: "fix", detail: "Gekühlte Mehrfachboxen mit vollständig zubereiteten Mahlzeiten, klarer Proteinangabe und schneller Erwärmung; keine Kochbox." },
    p2_eigene_option: "Bevorzugt wird ein fokussierter regionaler Pilot über Fitnesskontakte, sofern die Bewertung Problemrelevanz, Preis und Prüfbarkeit bestätigt.",
  },
  phase4Inputs: {
    p4_budget_zeit: { budgetEur: 4500, budgetSkipped: false, weeks: 8, weeksSkipped: false },
    p4_zielgruppen_zugang: "teilweise",
    p4_oeffentlichkeit: "öffentlich unter Marke ok",
    p4_methoden: { interviews: "ja", landingpage: "ja", anzeigen: "ja", mvp: "ja", vor_ort: "ja", umfrage: "egal", social: "ja" },
    p4_assets: { selected: ["Website", "Bestehende Kontakte/Kunden zur Zielgruppe", "E-Mail-Liste"] },
    p4_kapazitaet: { team: "kleines Team", skills: ["Kann Anzeigen schalten", "Kann Landingpage bauen", "Kann Content erstellen"] },
  },
  baseTime: "DEMO_BASE_TIME",
};

function recordMap(name, records) {
  const lines = [`const ${name}: Record<string, ${name.replace(/^./, (c) => c.toUpperCase().slice(0, -1))}> = {`];
  // fix type name hack below
  for (const [key, obj] of Object.entries(records)) lines.push(recordBlock(key, obj));
  lines.push("};");
  return lines.join("\n");
}

const typeNames = {
  statements: "FixtureStatement",
  options: "FixtureOption",
  evaluations: "FixtureEvaluation",
  validationSteps: "FixtureValidationStep",
  metrics: "FixtureMetric",
  kpiPoints: "FixtureKpiPoint",
  tasks: "FixtureTask",
  feedbacks: "FixtureFeedback",
};

function emitRecordMap(varName, typeName, records) {
  const lines = [`const ${varName}: Record<string, ${typeName}> = {`];
  for (const [key, obj] of Object.entries(records)) {
    const copy = { ...obj };
    if (copy.baseTime === "DEMO_BASE_TIME") copy.baseTime = undefined;
    lines.push(recordBlock(key, copy));
  }
  lines.push("};");
  return lines.join("\n");
}

const header = `/**
 * Deterministic Nouriva Meals demo fixture — sourced from docs/_nouriva_master_fixed.txt
 */
import type { TaskElaborationResponse } from "@/lib/schemas/taskElaboration";
import type { CompetitorAspect } from "@/lib/competitorAspects";
import type { SegmentAspect } from "@/lib/segmentAspects";
import {
  AdaptationType,
  AggregationStrategy,
  Criterion,
  EvaluationMode,
  EvidenceStatus,
  FeedbackResult,
  KpiAssessment,
  Laufmodus,
  MetricRole,
  MetricValueType,
  OptionStatus,
  Origin,
  ProxyStrength,
  SignalCategory,
  StatementCategory,
  StepType,
  StrategyDimension,
  TaskHerkunft,
  TestSubject,
} from "@prisma/client";
import { DEMO_BASE_TIME, DEMO_PROJECT_NAME, DEMO_PROJECT_SLUG } from "@/lib/demo/constants";

export type FixtureStatement = {
  key: string;
  phase: number;
  category: StatementCategory;
  content: string;
  evidenceStatus: EvidenceStatus;
  origin: Origin;
  justification?: string;
  sourceRef?: string;
  uncertainty?: string;
  adopted?: boolean;
  isCritical?: boolean;
  segmentLabel?: string;
  segmentAspect?: SegmentAspect;
  competitorLabel?: string;
  competitorAspect?: CompetitorAspect;
};

export type FixtureOption = {
  key: string;
  title: string;
  summary: string;
  status: OptionStatus;
  prioritizationRationale?: string;
  diversityNote?: string;
  modeNote?: string;
  statementKeys: string[];
};

export type FixtureEvaluation = {
  key: string;
  optionKey: string;
  criterion: Criterion;
  score: number;
  rationale: string;
};

export type FixtureValidationStep = {
  key: string;
  optionKey: string;
  assumptionKey: string;
  title: string;
  description: string;
  validationQuestion?: string;
  testDesign?: string;
  marketingActivities?: string[];
  channel?: string;
  timeframe?: string;
  budgetFrame?: string;
  stepType: StepType;
  strategyDimension?: StrategyDimension;
  testSubject?: TestSubject;
  adopted?: boolean;
  laufmodus?: Laufmodus;
  basiertAufUmsetzungKey?: string;
  metricKeys: string[];
  taskKeys: string[];
};

export type FixtureMetric = {
  key: string;
  stepKey: string;
  name: string;
  evaluationMode: EvaluationMode;
  valueType?: MetricValueType;
  aggregationStrategy?: AggregationStrategy;
  evaluationConfig?: Record<string, unknown>;
  numeratorLabel?: string;
  denominatorLabel?: string;
  observationUnit?: string;
  metricRole: MetricRole;
  signalCategory?: SignalCategory;
  proxyStrength?: ProxyStrength;
  signalRationale?: string;
  successCriterion: string;
  failureCriterion: string;
  kpiPointKeys: string[];
};

export type FixtureKpiPoint = {
  key: string;
  metricKey: string;
  periodLabel: string;
  value?: string;
  numerator?: number;
  denominator?: number;
  assessment: KpiAssessment;
};

export type FixtureTask = {
  key: string;
  stepKey: string;
  title: string;
  hint?: string;
  sortOrder: number;
  done?: boolean;
  annahmenBezugKey?: string;
  erfolgskriterium?: string;
  herkunft?: TaskHerkunft;
  elaboration?: TaskElaborationResponse;
};

export type FixtureFeedback = {
  key: string;
  stepKey: string;
  statementKey: string;
  content: string;
  result: FeedbackResult;
  interpretation?: string;
  proposedNewStatus?: EvidenceStatus;
  statusApplied?: boolean;
};

export type FixtureProject = {
  name: string;
  slug: string;
  currentPhase: number;
  profileOnboardingComplete: boolean;
  profileOnboardingStep: number;
  businessIdea: string;
  productStatus: string;
  assumedTarget: string;
  assumedProblem: string;
  valuePropDraft: string;
  revenueIdea: string;
  region: string;
  teamSize: number;
  budgetMonthly: string;
  timePerWeek: string;
  skills: string;
  existingInsights: string;
  pestelRelevance: Array<{
    category: string;
    relevant: boolean;
    relevanceJustification: string;
  }>;
  phase2Inputs: Record<string, unknown>;
  phase4Inputs: Record<string, unknown>;
  baseTime: Date;
};

export type DemoFixture = {
  project: FixtureProject;
  statements: Record<string, FixtureStatement>;
  options: Record<string, FixtureOption>;
  evaluations: Record<string, FixtureEvaluation>;
  validationSteps: Record<string, FixtureValidationStep>;
  metrics: Record<string, FixtureMetric>;
  kpiPoints: Record<string, FixtureKpiPoint>;
  tasks: Record<string, FixtureTask>;
  feedbacks: Record<string, FixtureFeedback>;
  adaptation: {
    optionKey: string;
    decision: AdaptationType;
    rationale: string;
    userConfirmed: boolean;
    loopBackToPhase?: number;
  };
};

`;

const projectBlock = `const project: FixtureProject = {
  name: DEMO_PROJECT_NAME,
  slug: DEMO_PROJECT_SLUG,
  baseTime: DEMO_BASE_TIME,
  currentPhase: ${project.currentPhase},
  profileOnboardingComplete: ${project.profileOnboardingComplete},
  profileOnboardingStep: ${project.profileOnboardingStep},
  businessIdea: \`${esc(project.businessIdea)}\`,
  productStatus: \`${esc(project.productStatus)}\`,
  assumedTarget: \`${esc(project.assumedTarget)}\`,
  assumedProblem: \`${esc(project.assumedProblem)}\`,
  valuePropDraft: \`${esc(project.valuePropDraft)}\`,
  revenueIdea: \`${esc(project.revenueIdea)}\`,
  region: \`${esc(project.region)}\`,
  teamSize: ${project.teamSize},
  budgetMonthly: \`${esc(project.budgetMonthly)}\`,
  timePerWeek: \`${esc(project.timePerWeek)}\`,
  skills: \`${esc(project.skills)}\`,
  existingInsights: \`${esc(project.existingInsights)}\`,
  pestelRelevance: ${JSON.stringify(project.pestelRelevance, null, 2).replace(/^/gm, "  ")},
  phase2Inputs: ${JSON.stringify(project.phase2Inputs, null, 2).replace(/^/gm, "  ")},
  phase4Inputs: ${JSON.stringify(project.phase4Inputs, null, 2).replace(/^/gm, "  ")},
};
`;

const body = [
  header,
  emitRecordMap("statements", "FixtureStatement", statements),
  "",
  emitRecordMap("options", "FixtureOption", options),
  "",
  emitRecordMap("evaluations", "FixtureEvaluation", evaluations),
  "",
  emitRecordMap("validationSteps", "FixtureValidationStep", validationSteps),
  "",
  emitRecordMap("metrics", "FixtureMetric", metrics),
  "",
  emitRecordMap("kpiPoints", "FixtureKpiPoint", kpiPoints),
  "",
  emitRecordMap("tasks", "FixtureTask", tasks),
  "",
  emitRecordMap("feedbacks", "FixtureFeedback", feedbacks),
  "",
  projectBlock,
  `const adaptation = ${objBlock(0, adaptation)};

export const DEMO_FIXTURE: DemoFixture = {
  project,
  statements,
  options,
  evaluations,
  validationSteps,
  metrics,
  kpiPoints,
  tasks,
  feedbacks,
  adaptation,
};
`,
].join("\n");

fs.writeFileSync(outPath, body, "utf8");

const counts = {
  statements: Object.keys(statements).length,
  options: Object.keys(options).length,
  evaluations: Object.keys(evaluations).length,
  validationSteps: Object.keys(validationSteps).length,
  metrics: Object.keys(metrics).length,
  kpiPoints: Object.keys(kpiPoints).length,
  tasks: Object.keys(tasks).length,
  feedbacks: Object.keys(feedbacks).length,
  pestel: Object.keys(statements).filter((k) => k.startsWith("p1_pestel")).length,
  segments: Object.keys(statements).filter((k) => k.startsWith("segment_")).length,
  customerProblems: Object.keys(statements).filter((k) => k.startsWith("cp_")).length,
  competitors: Object.keys(statements).filter((k) => k.startsWith("competitor_")).length,
  resources: Object.keys(statements).filter((k) => k.startsWith("p1_res")).length,
  swot: Object.keys(statements).filter((k) => k.startsWith("p1_swot")).length,
  marketPaths: Object.keys(statements).filter((k) => k.startsWith("p1_path")).length,
  optStatements: Object.keys(statements).filter((k) => k.includes("_opt_")).length,
  learning: Object.keys(statements).filter((k) => k.startsWith("p5_learn")).length,
};
console.log(JSON.stringify({ outPath, counts }, null, 2));
