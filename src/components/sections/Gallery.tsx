"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Shot {
  src: string;
  title: string;
  caption: string;
}

const shots: Shot[] = [
  {
    src: "/images/projekt-demontage.svg",
    title: "Tankdemontage im Aufstellraum",
    caption: "Zerlegung eines Stahltanks – platzsparend und sauber direkt vor Ort.",
  },
  {
    src: "/images/projekt-reinigung.svg",
    title: "Innenreinigung & Entfettung",
    caption: "Fachgerechte Reinigung vor Stilllegung oder Sanierung.",
  },
  {
    src: "/images/projekt-waermespeicher.svg",
    title: "Montage Haase Wärmespeicher",
    caption: "Standortgefertigter Wärmespeicher für moderne Heiztechnik.",
  },
  {
    src: "/images/projekt-erdtank.svg",
    title: "Stilllegung eines Erdtanks",
    caption: "Umweltgerechte Außerbetriebnahme inklusive Nachweis.",
  },
];

export function Gallery() {
  const [active, setActive] = useState<Shot | null>(null);

  return (
    <section id="referenzen" className="relative bg-steel-950 py-24 lg:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[50rem] -translate-x-1/2 rounded-full bg-teal-500/10 blur-[120px]" />
      <div className="container-page relative">
        <SectionHeading
          eyebrow="Einblicke"
          title={<>Saubere Arbeit, die man <span className="text-gradient">sieht</span></>}
          subtitle="Ein Eindruck unserer Arbeit. (Beispielbilder – gern ersetzen wir sie durch Ihre echten Projektfotos.)"
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shots.map((shot, i) => (
            <motion.button
              key={shot.src}
              onClick={() => setActive(shot)}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 text-left"
            >
              <Image
                src={shot.src}
                alt={shot.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-steel-950 via-steel-950/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-sm font-semibold text-white">{shot.title}</p>
              </div>
              <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-steel-950/70 text-amber-400 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <ZoomIn className="h-4 w-4" />
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-steel-950/90 p-5 backdrop-blur"
            role="dialog"
            aria-modal="true"
            aria-label={active.title}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-steel-900"
            >
              <div className="relative aspect-[4/3]">
                <Image src={active.src} alt={active.title} fill className="object-cover" sizes="100vw" />
              </div>
              <div className="flex items-start justify-between gap-4 p-6">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">{active.title}</h3>
                  <p className="mt-1 text-sm text-steel-400">{active.caption}</p>
                </div>
              </div>
              <button
                onClick={() => setActive(null)}
                aria-label="Schließen"
                className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-steel-950/70 text-white backdrop-blur transition-colors hover:bg-steel-950"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
