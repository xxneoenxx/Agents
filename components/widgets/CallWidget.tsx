"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Phone, PhoneCall, CalendarCheck, PhoneOutgoing, X } from "lucide-react";
import { company } from "@/content/site";
import { useBooking } from "../booking/BookingContext";

export function CallWidget() {
  const [open, setOpen] = useState(false);
  const { openBooking, openCallback } = useBooking();
  const reduce = useReducedMotion();

  const actions = [
    {
      icon: PhoneCall,
      label: "Jetzt anrufen",
      sub: company.phoneDisplay,
      href: `tel:${company.phoneHref}`,
    },
    {
      icon: PhoneOutgoing,
      label: "Rückruf anfordern",
      sub: "Wir melden uns",
      onClick: () => {
        setOpen(false);
        openCallback();
      },
    },
    {
      icon: CalendarCheck,
      label: "Termin buchen",
      sub: "Service & Prüfung",
      onClick: () => {
        setOpen(false);
        openBooking();
      },
    },
  ];

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="metal-panel w-64 overflow-hidden rounded-2xl"
          >
            <div className="border-b border-alu-line/70 px-4 py-3">
              <p className="eyebrow">Direkt erreichbar</p>
              <p className="mt-0.5 text-sm text-papier">Wie können wir helfen?</p>
            </div>
            <ul>
              {actions.map((a) => {
                const Icon = a.icon;
                const inner = (
                  <>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-adr/10 text-adr">
                      <Icon size={16} />
                    </span>
                    <span>
                      <span className="block text-sm text-papier">{a.label}</span>
                      <span className="block font-mono text-xs text-alu-dark">{a.sub}</span>
                    </span>
                  </>
                );
                return (
                  <li key={a.label} className="border-b border-alu-line/40 last:border-0">
                    {a.href ? (
                      <a href={a.href} className="flex items-center gap-3 px-4 py-3 transition hover:bg-adr/5">
                        {inner}
                      </a>
                    ) : (
                      <button
                        onClick={a.onClick}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-adr/5"
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Kontakt-Menü schließen" : "Kontakt-Menü öffnen"}
        aria-expanded={open}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-adr text-graphit shadow-[0_14px_40px_-10px_rgba(242,165,22,0.7)] transition hover:bg-adr-soft"
      >
        {!open && !reduce && (
          <span className="absolute inset-0 animate-ping rounded-full bg-adr/50" aria-hidden />
        )}
        <span className="relative">{open ? <X size={22} /> : <Phone size={22} />}</span>
      </button>
    </div>
  );
}
