"use client";

import { useEffect, useState } from "react";

/**
 * Liefert true, wenn der Nutzer reduzierte Bewegung bevorzugt.
 * Wird genutzt, um 3D-Szene/Animationen durch statische Fallbacks zu ersetzen.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
