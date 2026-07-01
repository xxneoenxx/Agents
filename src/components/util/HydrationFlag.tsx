"use client";

import { useEffect } from "react";

/**
 * Setzt nach erfolgreicher Hydration ein Attribut am <html>-Element.
 * Ein Inline-Failsafe-Skript (siehe layout.tsx) prüft dieses Attribut: Läuft die
 * React-Hydration NICHT (z. B. wegen eines geräte­spezifischen Fehlers), macht das
 * Skript alle per Animation zunächst unsichtbaren Inhalte sichtbar – die Seite bleibt
 * also nie leer. Läuft die Hydration normal, übernimmt Framer Motion wie gewohnt.
 */
export function HydrationFlag() {
  useEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "1");
  }, []);
  return null;
}
