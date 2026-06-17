"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Phone, Ticket, MapPin, Star } from "lucide-react";
import { cinema, fullAddress } from "@/lib/cinema";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-22%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const beamRotate = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 12]);

  return (
    <section
      ref={ref}
      id="hauptinhalt"
      className="grain relative flex min-h-[100svh] items-center justify-center overflow-hidden"
    >
      {/* Scheinwerfer-Kegel */}
      <motion.div
        aria-hidden
        style={{ rotate: beamRotate }}
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[120vh] w-[80vw] -translate-x-1/2 origin-top"
      >
        <div className="mx-auto h-full w-full bg-[conic-gradient(from_180deg_at_50%_0%,transparent_335deg,rgba(245,197,66,0.14)_350deg,rgba(245,197,66,0.22)_360deg,rgba(245,197,66,0.14)_370deg,transparent_385deg)] blur-2xl" />
      </motion.div>

      {/* schwebende Lichtpartikel */}
      {!reduce &&
        [...Array(6)].map((_, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute -z-10 rounded-full bg-gold/30 blur-sm"
            style={{
              width: 6 + i * 2,
              height: 6 + i * 2,
              left: `${12 + i * 14}%`,
              top: `${30 + (i % 3) * 18}%`,
            }}
            animate={{ y: [0, -24, 0], opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          />
        ))}

      <motion.div style={{ y, opacity }} className="container-x relative pt-28 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm backdrop-blur"
        >
          <Star className="h-4 w-4 fill-gold text-gold" />
          <span className="text-white/80">4,6 / 5 · Der Filmpalast am Roten Turm</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mx-auto max-w-4xl text-5xl leading-[0.95] sm:text-7xl lg:text-8xl"
        >
          Dein Kinoabend in <span className="text-gradient-gold">Chemnitz</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-6 max-w-xl text-lg text-white/70"
        >
          {cinema.halls} moderne Säle, gestochen scharfes Bild und Dolby-Atmos-Sound.
          Wähle deinen Film, sichere dir die besten Plätze – in unter einer Minute.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a href="#programm" className="btn-gold w-full sm:w-auto">
            <Ticket className="h-5 w-5" /> Zum Programm & Tickets
          </a>
          <a href={`tel:${cinema.contact.phoneHref}`} className="btn-ghost w-full sm:w-auto">
            <Phone className="h-5 w-5" /> {cinema.contact.phoneDisplay}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-2 text-sm text-white/55"
        >
          <MapPin className="h-4 w-4 text-gold" /> {fullAddress} · {cinema.openingHours}
        </motion.div>
      </motion.div>

      {/* Scroll-Indikator */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/25 p-1.5">
          <motion.span
            className="h-2 w-1 rounded-full bg-gold"
            animate={reduce ? undefined : { y: [0, 10, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}
