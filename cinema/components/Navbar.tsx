"use client";

import { useEffect, useState } from "react";
import { Phone, Menu, X, Film } from "lucide-react";
import { cinema } from "@/lib/cinema";

const links = [
  { href: "#programm", label: "Programm" },
  { href: "#erlebnis", label: "Erlebnis" },
  { href: "#aktionen", label: "Aktionen" },
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
        scrolled ? "border-b border-white/10 bg-ink/80 backdrop-blur-xl" : ""
      }`}
    >
      <nav className="container-x flex h-20 items-center justify-between">
        <a href="#hauptinhalt" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold text-ink">
            <Film className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl tracking-wide">CineStar</span>
            <span className="text-[0.6rem] uppercase tracking-[0.3em] text-gold">Chemnitz</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-white/75 transition hover:text-gold">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${cinema.contact.phoneHref}`}
            className="hidden items-center gap-2 text-sm font-semibold text-white/90 transition hover:text-gold sm:flex"
          >
            <Phone className="h-4 w-4" /> {cinema.contact.phoneDisplay}
          </a>
          <a href="#programm" className="hidden btn-gold !px-5 !py-2.5 sm:inline-flex">
            Tickets
          </a>
          <button
            type="button"
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="rounded-full p-2 text-white lg:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      <div
        className={`overflow-hidden bg-ink/95 backdrop-blur-xl transition-[max-height] duration-300 lg:hidden ${
          open ? "max-h-96 border-t border-white/10" : "max-h-0"
        }`}
      >
        <div className="container-x flex flex-col gap-1 py-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 font-medium text-white/85 transition hover:bg-white/5"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            <a href={`tel:${cinema.contact.phoneHref}`} className="btn-ghost">
              <Phone className="h-4 w-4" /> {cinema.contact.phoneDisplay}
            </a>
            <a href="#programm" onClick={() => setOpen(false)} className="btn-gold">
              Tickets sichern
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
