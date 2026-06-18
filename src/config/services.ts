/**
 * Leistungskatalog – wird in Hero-3D-Stationen, Leistungs-Sektion und Buchungsformular genutzt.
 * Inhalte basieren auf den real angebotenen Leistungen von Krebs Tanksysteme.
 */

export type ServiceId =
  | "demontage"
  | "reinigung"
  | "sanierung"
  | "erdtank"
  | "kellertank"
  | "waermespeicher"
  | "gfk"
  | "nachweise";

export interface Service {
  id: ServiceId;
  /** Kurzer Schlüsselbegriff für die 3D-Station */
  station: string;
  title: string;
  short: string;
  description: string;
  bullets: string[];
  /** lucide-react Icon-Name */
  icon: string;
  accent: "amber" | "teal";
}

export const services: Service[] = [
  {
    id: "demontage",
    station: "Demontage",
    title: "Demontage & Entsorgung von Heizöltanks",
    short: "Fachgerechter Rückbau von PE-, GFK- und Stahltanks inkl. Entsorgung.",
    description:
      "Wir demontieren Heizöltanks jeder Bauart direkt im Aufstellraum – inklusive Reinigung, Entfettung, Abtransport und ordnungsgemäßer Entsorgung sämtlicher Reststoffe.",
    bullets: [
      "PE-, GFK- und Stahltanks",
      "Zerlegung im Aufstellraum",
      "Entsorgung von Restheizöl, Ölschlamm & Innenhüllen",
      "Reinigungsmittel, Kunststoff, Rohrleitungen & Stahl",
    ],
    icon: "Wrench",
    accent: "amber",
  },
  {
    id: "reinigung",
    station: "Reinigung",
    title: "Tankreinigung, Stilllegung & Wartung",
    short: "Reinigung, Stilllegung, Wartung und Service Ihrer Öltankanlage.",
    description:
      "Professionelle Innenreinigung und Wartung sorgen für Betriebssicherheit und Werterhalt. Auf Wunsch übernehmen wir die fachgerechte Stilllegung Ihrer Anlage.",
    bullets: [
      "Innenreinigung & Entfettung",
      "Stilllegung von Tankanlagen",
      "Wartung & Service von Öltanks",
      "Sichtprüfung & Zustandsbewertung",
    ],
    icon: "Droplets",
    accent: "teal",
  },
  {
    id: "sanierung",
    station: "Sanierung",
    title: "Sanierung & Instandsetzung",
    short: "Werterhaltende Instandsetzung statt teurem Komplettaustausch.",
    description:
      "Wo möglich, sanieren wir bestehende Heizöltanks fachgerecht und verlängern so deren Lebensdauer – wirtschaftlich und nach geltenden Vorschriften.",
    bullets: [
      "Begutachtung & Bestandsaufnahme",
      "Innensanierung von Tanks",
      "Wiederherstellung der Dichtheit",
      "Dokumentation der Maßnahmen",
    ],
    icon: "ShieldCheck",
    accent: "amber",
  },
  {
    id: "erdtank",
    station: "Erdtank",
    title: "Stilllegung & Reinigung von Erdtanks",
    short: "Sichere Außerbetriebnahme erdverlegter Tanks.",
    description:
      "Erdverlegte Tanks reinigen und legen wir normgerecht still – inklusive aller erforderlichen Schritte für eine umweltgerechte Außerbetriebnahme.",
    bullets: [
      "Reinigung erdverlegter Tanks",
      "Normgerechte Stilllegung",
      "Umweltgerechte Entsorgung",
      "Vorbereitung der Verfüllung",
    ],
    icon: "Layers",
    accent: "teal",
  },
  {
    id: "kellertank",
    station: "Kellertank",
    title: "Montage Haase Kellertanks",
    short: "Standortgefertigte Haase Kellertanks für Heizöl.",
    description:
      "Wir montieren standortgefertigte Haase Kellertanks – platzsparend, durch enge Türen einbringbar und mit langer Lebensdauer für Ihre Heizölbevorratung.",
    bullets: [
      "Standortgefertigt im Aufstellraum",
      "Einbringung durch enge Zugänge",
      "Hohe Lebensdauer & Sicherheit",
      "Geeignet für Heizöl",
    ],
    icon: "Container",
    accent: "amber",
  },
  {
    id: "waermespeicher",
    station: "Wärmespeicher",
    title: "Montage Haase Wärmespeicher",
    short: "Standortgefertigte Wärmespeicher für moderne Heizsysteme.",
    description:
      "Standortgefertigte Haase Wärmespeicher schaffen die Grundlage für effiziente, zukunftsfähige Heiztechnik – ideal in Kombination mit Wärmepumpe, Solar oder Holzheizung.",
    bullets: [
      "Standortgefertigte Montage",
      "Große Speichervolumen möglich",
      "Für Wärmepumpe, Solar & Co.",
      "Zukunftssichere Heiztechnik",
    ],
    icon: "Flame",
    accent: "amber",
  },
  {
    id: "gfk",
    station: "GFK-Reparatur",
    title: "Behälterbau, GFK-Reparatur & Laminierarbeiten",
    short: "Reparatur von GFK, Laminat- und Klebverbindungen.",
    description:
      "Mit langjähriger Erfahrung im Behälterbau führen wir GFK-Reparaturen sowie Laminier- und Klebearbeiten an Tanks und Behältern fachgerecht aus.",
    bullets: [
      "GFK-Reparaturen",
      "Laminierarbeiten",
      "Klebverbindungen",
      "Individueller Behälterbau",
    ],
    icon: "Hammer",
    accent: "teal",
  },
  {
    id: "nachweise",
    station: "Nachweise",
    title: "Behördennachweise & Abmeldung",
    short: "Entsorgungsnachweise und Anzeige bei der Unteren Wasserbehörde.",
    description:
      "Wir erstellen alle erforderlichen Nachweise über die Entsorgung und übernehmen Anzeige sowie Abmeldung bei der zuständigen Unteren Wasserbehörde – damit Sie rechtlich auf der sicheren Seite sind.",
    bullets: [
      "Entsorgungsnachweise",
      "Anzeige bei der Wasserbehörde",
      "Abmeldung der Anlage",
      "Vollständige Dokumentation",
    ],
    icon: "FileCheck",
    accent: "teal",
  },
];

/** Auswahl der prominent dargestellten Leistungen (6 Karten in der Sektion). */
export const featuredServiceIds: ServiceId[] = [
  "demontage",
  "reinigung",
  "sanierung",
  "erdtank",
  "kellertank",
  "waermespeicher",
];
