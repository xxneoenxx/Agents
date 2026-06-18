/**
 * ZENTRALE FIRMENKONFIGURATION – Single Source of Truth.
 *
 * >>> VOR GO-LIVE PRÜFEN <<<
 * Mit "PLATZHALTER" markierte Werte muss der Kunde bestätigen/ergänzen.
 * Verifizierte Werte (aus öffentlicher Recherche) sind mit "// verifiziert" markiert,
 * sollten aber dennoch vom Kunden gegengelesen werden.
 */

export const site = {
  name: "Krebs Tanksysteme", // verifiziert
  legalName: "Krebs Tanksysteme – Tankbau-Demontage-Service", // PLATZHALTER: vollständige Rechtsform (z. B. Inh. / GmbH) bestätigen
  tagline: "Tankbau · Demontage · Wärmespeicher",
  claim: "Ihr Fachbetrieb nach WHG für Heizöltanks – sicher demontiert, fachgerecht entsorgt, modern erneuert.",
  description:
    "Krebs Tanksysteme ist Ihr zertifizierter Fachbetrieb nach WHG für die Demontage, Reinigung, Sanierung und Entsorgung von Heizöltanks sowie die Montage standortgefertigter Haase Keller- und Wärmespeicher. TÜV-Süd-überwacht.",

  // --- Kontakt ---
  phone: {
    display: "037296 887055", // verifiziert
    href: "tel:+4937296887055",
  },
  mobile: {
    display: "0171 4863938", // verifiziert
    href: "tel:+491714863938",
  },
  email: "info@krebs-tanksysteme.de", // PLATZHALTER: echte E-Mail bestätigen
  whatsapp: {
    // PLATZHALTER: WhatsApp-Nummer bestätigen (internationales Format ohne +/Leerzeichen)
    number: "491714863938",
    href: "https://wa.me/491714863938",
  },

  // --- Adresse ---
  address: {
    street: "Thalheimer Straße 1", // verifiziert
    zip: "09390", // verifiziert
    city: "Gornsdorf", // verifiziert
    region: "Sachsen",
    country: "DE",
    mapsQuery: "Krebs Tanksysteme, Thalheimer Straße 1, 09390 Gornsdorf",
  },

  // --- Öffnungszeiten --- PLATZHALTER: echte Zeiten bestätigen
  hours: [
    { days: "Mo – Fr", time: "07:00 – 17:00 Uhr" },
    { days: "Sa", time: "Nach Vereinbarung" },
    { days: "So / Feiertag", time: "Geschlossen" },
  ],

  // --- Zertifizierung / Trust ---
  trust: {
    whg: "Fachbetrieb nach § 62 WHG", // verifiziert
    tuv: "Überwacht & geprüft durch TÜV Süd Industrie Service GmbH", // verifiziert
  },

  // --- Social --- PLATZHALTER: Links bestätigen/ergänzen
  social: {
    facebook: "https://www.facebook.com/KrebsTanksysteme/", // verifiziert
    website: "https://www.krebs-tanksysteme.de", // verifiziert
  },

  // --- SEO ---
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.krebs-tanksysteme.de",
} as const;

export type SiteConfig = typeof site;
