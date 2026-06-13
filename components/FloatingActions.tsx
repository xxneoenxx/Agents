"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, CalendarCheck } from "lucide-react";
import { restaurant } from "@/lib/restaurant";

// Schwebende Aktions-Buttons (Anrufen / Reservieren), die nach dem Hero
// eingeblendet werden – besonders praktisch auf dem Smartphone.
export function FloatingActions() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3"
        >
          <a
            href={`tel:${restaurant.contact.phoneHref}`}
            aria-label="Jetzt anrufen"
            className="group flex h-14 w-14 items-center justify-center rounded-full bg-forest text-cream shadow-soft transition hover:scale-105 hover:bg-forest-light sm:hidden"
          >
            <Phone className="h-6 w-6" />
          </a>
          <a
            href="#reservieren"
            className="flex items-center gap-2 rounded-full bg-copper px-5 py-3.5 font-semibold text-cream shadow-soft transition hover:scale-105 hover:bg-copper-light"
          >
            <CalendarCheck className="h-5 w-5" />
            <span className="hidden sm:inline">Tisch reservieren</span>
            <span className="sm:hidden">Reservieren</span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
