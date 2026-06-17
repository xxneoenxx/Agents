"use client";

import { useEffect, useState } from "react";
import { Phone, Menu, X, Layers } from "lucide-react";
import { company } from "@/lib/elmtech";
import { useCallbackModal } from "./callback/CallbackProvider";

const links = [
  { href: "#leistungen", label: "Leistungen" },
  { href: "#aufbau", label: "Aufbau" },
  { href: "#produkte", label: "Produkte" },
  { href: "#unternehmen", label: "Unternehmen" },
  { href: "#kontakt", label: "Kontakt" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { open: openCallback } = useCallbackModal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? "border-b border-white/10 bg-graphite/85 backdrop-blur-xl" : ""
      }`}
    >
      <nav className="container-x flex h-20 items-center justify-between">
        <a href="#hauptinhalt" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
            <Layers className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold tracking-tight">Elmtech</span>
            <span className="text-[0.6rem] uppercase tracking-[0.28em] text-cyan">Verbundelemente</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-steel-200 transition hover:text-cyan">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`tel:${company.contact.phoneHref}`}
            className="hidden items-center gap-2 text-sm font-semibold text-white transition hover:text-cyan sm:flex"
          >
            <Phone className="h-4 w-4" /> {company.contact.phoneDisplay}
          </a>
          <button onClick={() => openCallback()} className="hidden btn-primary !px-5 !py-2.5 sm:inline-flex">
            Rückruf
          </button>
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
        className={`overflow-hidden bg-graphite/95 backdrop-blur-xl transition-[max-height] duration-300 lg:hidden ${
          open ? "max-h-96 border-t border-white/10" : "max-h-0"
        }`}
      >
        <div className="container-x flex flex-col gap-1 py-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 font-medium text-steel-200 transition hover:bg-white/5"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            <a href={`tel:${company.contact.phoneHref}`} className="btn-ghost">
              <Phone className="h-4 w-4" /> {company.contact.phoneDisplay}
            </a>
            <button
              onClick={() => {
                setOpen(false);
                openCallback();
              }}
              className="btn-primary"
            >
              Rückruf vereinbaren
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
