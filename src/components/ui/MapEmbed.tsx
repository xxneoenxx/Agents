"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ExternalLink } from "lucide-react";
import { site } from "@/config/site";

const STORAGE_KEY = "kt-maps-consent";

/**
 * DSGVO-konforme Google-Maps-Einbindung: Die Karte (und damit eine mögliche
 * Datenübertragung an Google) wird erst nach aktiver Zustimmung geladen.
 * Die Zustimmung wird in localStorage gespeichert.
 */
export function MapEmbed() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1") {
      setConsented(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setConsented(true);
  };

  const mapsSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    site.address.mapsQuery,
  )}&output=embed`;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    site.address.mapsQuery,
  )}`;

  if (consented) {
    return (
      <iframe
        title={`Standort ${site.name}`}
        src={mapsSrc}
        className="h-full w-full grayscale-[0.3]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ minHeight: 420, border: 0 }}
      />
    );
  }

  return (
    <div className="relative flex h-full min-h-[420px] flex-col items-center justify-center gap-5 bg-steel-950 p-8 text-center">
      {/* dekorativer Karten-Platzhalter */}
      <div className="pointer-events-none absolute inset-0 bg-grid-steel bg-[size:32px_32px] opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.12),transparent_60%)]" />

      <span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-400">
        <MapPin className="h-8 w-8" />
      </span>
      <div className="relative max-w-sm">
        <h3 className="font-display text-lg font-semibold text-white">Standort auf Google Maps</h3>
        <p className="mt-2 text-sm text-steel-400">
          Zum Schutz Ihrer Daten wird die Karte erst nach Ihrer Zustimmung geladen. Dabei können
          Daten an Google übertragen werden. Details in der{" "}
          <Link href="/datenschutz" className="text-amber-400 underline">
            Datenschutzerklärung
          </Link>
          .
        </p>
      </div>
      <div className="relative flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={accept}
          className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-steel-950 transition-colors hover:bg-amber-400"
        >
          Karte laden
        </button>
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-steel-200 hover:border-amber-400/60"
        >
          In Google Maps öffnen <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
