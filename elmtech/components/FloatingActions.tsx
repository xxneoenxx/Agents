"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneCall } from "lucide-react";
import { company } from "@/lib/elmtech";
import { useCallbackModal } from "./callback/CallbackProvider";

export function FloatingActions() {
  const [visible, setVisible] = useState(false);
  const { open } = useCallbackModal();

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
          className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <a
            href={`tel:${company.contact.phoneHref}`}
            aria-label="Anrufen"
            className="grid h-14 w-14 place-items-center rounded-full bg-white/10 text-white shadow-card backdrop-blur transition hover:scale-105 hover:bg-white/20 sm:hidden"
          >
            <Phone className="h-6 w-6" />
          </a>
          <button
            onClick={() => open()}
            className="flex items-center gap-2 rounded-full bg-brand px-5 py-3.5 font-semibold text-white shadow-glow transition hover:scale-105 hover:bg-brand-light"
          >
            <PhoneCall className="h-5 w-5" />
            <span className="hidden sm:inline">Rückruf vereinbaren</span>
            <span className="sm:hidden">Rückruf</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
