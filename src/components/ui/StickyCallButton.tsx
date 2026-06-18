"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, MessageCircle } from "lucide-react";
import { site } from "@/config/site";

/** Schwebende Anruf-/WhatsApp-Buttons – v. a. auf Mobilgeräten präsent. */
export function StickyCallButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.9 }}
          className="fixed bottom-5 right-5 z-40 flex flex-col gap-3"
        >
          <a
            href={site.whatsapp.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp-Nachricht senden"
            className="grid h-14 w-14 place-items-center rounded-full bg-teal-500 text-steel-950 shadow-glow-teal transition-transform hover:scale-110"
          >
            <MessageCircle className="h-6 w-6" />
          </a>
          <a
            href={site.phone.href}
            aria-label={`Anrufen: ${site.phone.display}`}
            className="grid h-14 w-14 place-items-center rounded-full bg-amber-500 text-steel-950 shadow-glow transition-transform hover:scale-110"
          >
            <Phone className="h-6 w-6" />
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
