"use client";

import { useEffect, useState } from "react";

/**
 * Fortschritt 0..1 des Scrollens über die ersten `spanVh` Viewport-Höhen.
 * Treibt die Rotation/Station der 3D-Hero-Szene an, sodass sich die Szene
 * beim Scrollen mit der Seite "weiterdreht".
 */
export function useScrollProgress(spanVh = 2.2): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const span = window.innerHeight * spanVh;
        const p = Math.min(1, Math.max(0, window.scrollY / span));
        setProgress(p);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [spanVh]);

  return progress;
}
