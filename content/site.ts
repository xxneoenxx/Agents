/**
 * Zentrale Inhalts- und Stammdaten der Website.
 * Alle Texte, Kontaktdaten und Listen werden hier gepflegt — kein Hardcoding in Komponenten.
 */

export const company = {
  name: "Niemeier Fahrzeugwerke",
  legalName: "Niemeier Fahrzeugwerke GmbH",
  tagline: "Metallbau, Service & Tankfahrzeuge aus Lunzenau",
  foundedYear: 2022,
  hrb: "HRB 34943",
  registerCourt: "Amtsgericht Chemnitz",
  managingDirectors: ["Josef Niemeier", "Alexander Vazquez"],
  predecessor: "Willig Fahrzeugwerke GmbH",
  address: {
    street: "Cossener Straße 2",
    zip: "09328",
    city: "Lunzenau",
    district: "OT Berthelsdorf",
    country: "Deutschland",
  },
  // Telefon: international + sprechende Anzeige + tel:-konforme Form
  phoneDisplay: "+49 37383 7498-0",
  phoneHref: "+49373837498-0",
  email: "info@niemeier-fahrzeugwerke.eu",
  // Sprechzeiten der Werkstatt
  hours: [
    { day: "Mo – Do", time: "07:00 – 16:30 Uhr" },
    { day: "Freitag", time: "07:00 – 13:00 Uhr" },
    { day: "Sa – So", time: "geschlossen" },
  ],
} as const;

export const nav = [
  { label: "Leistungen", href: "#leistungen" },
  { label: "Fertigung", href: "#fertigung" },
  { label: "Material", href: "#material" },
  { label: "Service", href: "#service" },
  { label: "Werk", href: "#werk" },
  { label: "Kontakt", href: "#kontakt" },
] as const;

export const hero = {
  eyebrow: "Tankfahrzeugbau · Metallbau · Nutzfahrzeug-Service",
  headlineTop: "Tankfahrzeuge",
  headlineAccent: "aus Aluminium.",
  headlineBottom: "Gebaut, geprüft, gewartet in Sachsen.",
  intro:
    "Vom ultraleichten Aluminiumtank über den maßgefertigten Aufbau bis zur wiederkehrenden Tankprüfung: Niemeier Fahrzeugwerke vereint Fertigung, Aufbau und Service unter einem Dach in Lunzenau.",
  stats: [
    { value: "30 %", label: "weniger Leergewicht durch Alu-Tanks" },
    { value: "1 Werk", label: "Fertigung & Service kombiniert" },
    { value: "ADR", label: "Tankprüfungen nach Vorschrift" },
  ],
} as const;

export const leistungen = [
  {
    id: "tankfahrzeuge",
    code: "01",
    title: "Tankfahrzeuge",
    summary:
      "Ultraleichte Tanks aus Aluminium für LKW und Auflieger — mehr Nutzlast bei jeder Fahrt.",
    points: ["Alu-Tanks & Kammern", "LKW-Aufbau & Auflieger", "Mehr Nutzlast, weniger Verbrauch"],
  },
  {
    id: "aufbauten",
    code: "02",
    title: "Aufbauten & Sonderbau",
    summary:
      "Maßgeschneiderte Fahrzeugaufbauten und Komponenten — geplant und gefertigt nach Ihrem Einsatz.",
    points: ["Individuelle Aufbauten", "Komponenten & Anbauteile", "Vom Entwurf bis zur Montage"],
  },
  {
    id: "metallbau",
    code: "03",
    title: "Metallbau",
    summary:
      "Schneiden, Kanten, Runden, Schweißen und Lackieren von Blechen und Profilen — Alu, Stahl, Edelstahl.",
    points: ["CNC-Zuschnitt & Kanten", "Schweißen & Runden", "Pulver- & Nasslackierung"],
  },
  {
    id: "service",
    code: "04",
    title: "Service & Prüfung",
    summary:
      "Bremsenservice, Tankprüfungen, Wartung und Reparatur für Tankfahrzeuge und Nutzfahrzeuge.",
    points: ["Bremsenservice", "Tankprüfungen", "Wartung & Reparatur"],
  },
] as const;

export const prozess = [
  {
    step: "01",
    title: "Schneiden",
    desc: "Präziser Zuschnitt von Blechen und Profilen — Aluminium, Stahl und Edelstahl auf den Millimeter.",
    spec: "Toleranz ± 0,5 mm",
  },
  {
    step: "02",
    title: "Kanten & Runden",
    desc: "Abkanten und Runden formt aus dem Blech die tragende Geometrie von Tank und Aufbau.",
    spec: "Bis 4 m Länge",
  },
  {
    step: "03",
    title: "Schweißen",
    desc: "Dichte, geprüfte Nähte — die Grundlage für sichere Tanks und langlebige Aufbauten.",
    spec: "Alu · Stahl · Edelstahl",
  },
  {
    step: "04",
    title: "Lackieren",
    desc: "Schutz und Finish: Oberflächen, die Witterung, Reinigung und Straßenbetrieb standhalten.",
    spec: "Nass- & Pulverlack",
  },
  {
    step: "05",
    title: "Prüfung",
    desc: "Abnahme und Tankprüfung nach Vorschrift, bevor das Fahrzeug zurück auf die Straße geht.",
    spec: "ADR-konform",
  },
] as const;

export const materialien = [
  {
    name: "Aluminium",
    note: "Leicht & korrosionsbeständig",
    detail: "Das Material für maximale Nutzlast — Standard für unsere Tankaufbauten.",
    spec: "EN AW-Legierungen",
  },
  {
    name: "Stahl",
    note: "Robust & belastbar",
    detail: "Für tragende Strukturen, Rahmen und stark beanspruchte Komponenten.",
    spec: "S235 – S355",
  },
  {
    name: "Edelstahl",
    note: "Hygienisch & beständig",
    detail: "Wo Medien und Reinigung höchste Beständigkeit verlangen.",
    spec: "1.4301 / 1.4571",
  },
] as const;

export const serviceLeistungen = [
  {
    title: "Bremsenservice",
    desc: "Prüfung, Wartung und Instandsetzung der Bremsanlage für Zugmaschine und Auflieger.",
  },
  {
    title: "Tankprüfungen",
    desc: "Wiederkehrende Prüfungen an Tankfahrzeugen nach den geltenden Vorschriften.",
  },
  {
    title: "Wartung",
    desc: "Planbare Wartungsintervalle, die Standzeiten kurz und Fuhrparks einsatzbereit halten.",
  },
  {
    title: "Reparatur",
    desc: "Instandsetzung an Tanks, Aufbauten und Nutzfahrzeugen — schnell und fachgerecht.",
  },
] as const;

export const fakten = [
  { value: 2022, suffix: "", label: "Gegründet in Lunzenau" },
  { value: 3, suffix: "", label: "Werkstoffe: Alu, Stahl, Edelstahl" },
  { value: 5, suffix: "", label: "Schritte von Blech bis Abnahme" },
  { value: 1, suffix: "", label: "Werk für Bau & Service" },
] as const;

export const ueberUns = {
  eyebrow: "Das Werk",
  title: "Ein Werk für Bau und Service",
  body: [
    "Niemeier Fahrzeugwerke ging 2022 aus der Willig Fahrzeugwerke GmbH hervor und steht in Lunzenau für eine seltene Kombination: Tankfahrzeugbau, Metallbau und Nutzfahrzeug-Service an einem Standort.",
    "Wer auf ultraleichte Aluminiumtanks umstellt, gewinnt Nutzlast bei jeder Fahrt. Und weil Fertigung und Service im selben Werk liegen, kommt alles aus einer Hand — von der ersten Naht bis zur wiederkehrenden Prüfung.",
  ],
  leadership: [
    { name: "Josef Niemeier", role: "Geschäftsführer" },
    { name: "Alexander Vazquez", role: "Geschäftsführer" },
  ],
} as const;

// Buchbare Leistungen für das Buchungssystem
export const bookingServices = [
  { id: "tankpruefung", label: "Tankprüfung", desc: "Wiederkehrende Prüfung nach Vorschrift" },
  { id: "bremsenservice", label: "Bremsenservice", desc: "Prüfung & Instandsetzung der Bremsanlage" },
  { id: "wartung", label: "Wartung", desc: "Planmäßige Wartung Ihres Fahrzeugs" },
  { id: "reparatur", label: "Reparatur", desc: "Instandsetzung an Tank, Aufbau oder Fahrzeug" },
  { id: "aufbau", label: "Aufbau / Sonderbau", desc: "Anfrage für Tank- oder Sonderaufbau" },
  { id: "sonstiges", label: "Sonstiges", desc: "Andere Anliegen — beschreiben Sie sie kurz" },
] as const;

export const timeSlots = [
  "Vormittag (07:00 – 12:00)",
  "Nachmittag (12:00 – 16:30)",
  "Ganztägig flexibel",
] as const;
