"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Phone, CalendarCheck } from "lucide-react";
import { Button } from "../ui/Button";
import { nav, company } from "@/content/site";
import { useBooking } from "../booking/BookingContext";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { openBooking } = useBooking();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[70] transition-all duration-300 ${
        scrolled ? "border-b border-alu-line/70 bg-graphit/85 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav className="container-edge flex h-16 items-center justify-between gap-4">
        <a href="#top" className="group flex items-center gap-2.5" aria-label="Zur Startseite">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-adr font-display text-base font-extrabold text-graphit">
            N
          </span>
          <span className="hidden font-display text-sm font-semibold uppercase tracking-widest text-papier sm:block">
            Niemeier <span className="text-alu-dark">Fahrzeugwerke</span>
          </span>
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="rounded px-3 py-2 font-mono text-xs uppercase tracking-widest text-alu transition hover:text-adr"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={`tel:${company.phoneHref}`}
            className="flex items-center gap-2 font-mono text-xs tracking-wide text-alu transition hover:text-adr"
          >
            <Phone size={14} /> {company.phoneDisplay}
          </a>
          <Button variant="primary" onClick={() => openBooking()} className="!px-4 !py-2.5">
            <CalendarCheck size={15} /> Termin
          </Button>
        </div>

        <button
          className="rounded border border-alu-line p-2 text-alu lg:hidden"
          aria-label={menuOpen ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-alu-line/70 bg-graphit/95 backdrop-blur-md lg:hidden"
          >
            <ul className="container-edge flex flex-col py-3">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block border-b border-alu-line/40 py-3 font-mono text-sm uppercase tracking-widest text-alu"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li className="flex flex-col gap-3 pt-4">
                <Button variant="primary" onClick={() => { setMenuOpen(false); openBooking(); }}>
                  <CalendarCheck size={15} /> Service-Termin buchen
                </Button>
                <Button variant="outline" href={`tel:${company.phoneHref}`}>
                  <Phone size={15} /> {company.phoneDisplay}
                </Button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
