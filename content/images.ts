/**
 * Zentrale Bildverwaltung — Foto-Swap ohne Code-Eingriff.
 *
 * Die Original-Fotos von niemeier-fahrzeugwerke.eu konnten in der Build-Umgebung
 * nicht automatisch geladen werden (Domain durch Egress-Policy gesperrt).
 * Bis die echten Fotos vorliegen, zeigen die Slots klar gekennzeichnete Platzhalter.
 *
 * SO TAUSCHEN SIE FOTOS EIN:
 *  1. Echtes Bild nach /public/images/ legen (z. B. tankfahrzeug.jpg)
 *  2. Hier den passenden `src` auf den neuen Pfad setzen (z. B. "/images/tankfahrzeug.jpg")
 *  3. `placeholder: false` setzen — fertig.
 */

export type SiteImage = {
  src: string;
  alt: string;
  /** true = noch Platzhalter (Original-Foto fehlt) */
  placeholder: boolean;
};

export const images: Record<string, SiteImage> = {
  werkstatt: {
    src: "/images/placeholder-werkstatt.svg",
    alt: "Fertigungshalle der Niemeier Fahrzeugwerke in Lunzenau",
    placeholder: true,
  },
  tankfahrzeug: {
    src: "/images/placeholder-tankfahrzeug.svg",
    alt: "Aluminium-Tankfahrzeug von Niemeier Fahrzeugwerke",
    placeholder: true,
  },
  metallbau: {
    src: "/images/placeholder-metallbau.svg",
    alt: "Metallbearbeitung: Schneiden, Kanten und Schweißen",
    placeholder: true,
  },
  service: {
    src: "/images/placeholder-service.svg",
    alt: "Nutzfahrzeug-Service in der Werkstatt",
    placeholder: true,
  },
};
