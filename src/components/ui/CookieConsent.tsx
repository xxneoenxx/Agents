"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie } from "lucide-react";
import { safeLocalGet, safeLocalSet } from "@/lib/utils";

const STORAGE_KEY = "kt-cookie-consent";

/**
 * Schlankes Hinweis-Banner. Diese Seite setzt selbst keine Marketing-/Tracking-Cookies;
 * externe Inhalte (Google Maps) werden ohnehin erst nach separater Zustimmung geladen
 * (siehe MapEmbed). Das Banner dokumentiert dies transparent.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!safeLocalGet(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const decide = (value: "all" | "essential") => {
    safeLocalSet(STORAGE_KEY, value);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-label="Datenschutz-Hinweis"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl sm:inset-x-auto sm:left-5 sm:bottom-5"
        >
          <div className="border-shine rounded-2xl">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-steel-900/95 p-5 backdrop-blur-xl sm:flex-row sm:items-center">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                <Cookie className="h-6 w-6" />
              </span>
              <p className="flex-1 text-sm leading-relaxed text-steel-300">
                Wir verwenden nur technisch notwendige Funktionen. Externe Inhalte wie Google Maps
                werden erst nach Ihrer Zustimmung geladen. Mehr in der{" "}
                <Link href="/datenschutz" className="text-amber-400 underline">
                  Datenschutzerklärung
                </Link>
                .
              </p>
              <div className="flex flex-none gap-2">
                <button
                  onClick={() => decide("essential")}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-steel-200 transition-colors hover:border-white/30"
                >
                  Nur notwendige
                </button>
                <button
                  onClick={() => decide("all")}
                  className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-steel-950 transition-colors hover:bg-amber-400"
                >
                  Verstanden
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
