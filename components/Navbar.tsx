"use client";

import { useEffect, useState } from "react";
import { Phone, Menu, X } from "lucide-react";
import { restaurant } from "@/lib/restaurant";

const links = [
  { href: "#ueber-uns", label: "Über uns" },
  { href: "#erlebnis", label: "Erlebnis" },
  { href: "#speisekarte", label: "Speisekarte" },
  { href: "#oeffnungszeiten", label: "Öffnungszeiten" },
  { href: "#kontakt", label: "Anfahrt" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-cream/90 shadow-card backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <nav className="container-x flex h-20 items-center justify-between">
        <a href="#hauptinhalt" className="flex flex-col leading-tight">
          <span className="font-serif text-lg font-bold text-bark sm:text-xl">
            Bauernhof
          </span>
          <span className="text-[0.65rem] uppercase tracking-[0.25em] text-copper">
            zum Silberbergwerk
          </span>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-bark/80 transition hover:text-copper"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${restaurant.contact.phoneHref}`}
            className="hidden items-center gap-2 text-sm font-semibold text-bark transition hover:text-copper sm:flex"
          >
            <Phone className="h-4 w-4" />
            {restaurant.contact.phoneDisplay}
          </a>
          <a href="#reservieren" className="hidden sm:inline-flex btn-primary !px-5 !py-2.5">
            Tisch reservieren
          </a>
          <button
            type="button"
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-full p-2 text-bark lg:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobiles Menü */}
      <div
        className={`overflow-hidden bg-cream/95 backdrop-blur-md transition-[max-height] duration-300 lg:hidden ${
          open ? "max-h-96 border-t border-bark/10" : "max-h-0"
        }`}
      >
        <div className="container-x flex flex-col gap-1 py-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 font-medium text-bark/90 transition hover:bg-sand"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            <a
              href={`tel:${restaurant.contact.phoneHref}`}
              className="btn-secondary"
            >
              <Phone className="h-4 w-4" /> {restaurant.contact.phoneDisplay}
            </a>
            <a
              href="#reservieren"
              onClick={() => setOpen(false)}
              className="btn-primary"
            >
              Tisch reservieren
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
