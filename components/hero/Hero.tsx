"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { Phone, CalendarCheck, MousePointer2 } from "lucide-react";
import { Button } from "../ui/Button";
import { hero, company } from "@/content/site";
import { useBooking } from "../booking/BookingContext";

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => <SceneFallback label="Szene wird geladen…" />,
});

function SceneFallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-alu-line border-t-adr" />
        <span className="font-mono text-xs uppercase tracking-widest text-alu-dark">{label}</span>
      </div>
    </div>
  );
}

export function Hero() {
  const { openBooking } = useBooking();
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-[100svh] w-full overflow-hidden bg-graphit">
      {/* 3D-Szene */}
      <div className="absolute inset-0">
        {reduce ? (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(242,165,22,0.12),transparent_60%)]" />
        ) : (
          <HeroScene />
        )}
      </div>

      {/* Feines Raster + Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-grid-fine bg-[size:48px_48px] opacity-[0.18]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-graphit via-graphit/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-graphit/90 via-transparent to-transparent" />

      {/* Inhalt */}
      <div className="container-edge relative z-10 flex min-h-[100svh] flex-col justify-center pt-28 pb-24">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="eyebrow mb-6"
        >
          {hero.eyebrow}
        </motion.p>

        <h1 className="max-w-3xl font-display text-[2.6rem] font-extrabold leading-[0.98] sm:text-6xl lg:text-7xl">
          {[hero.headlineTop, hero.headlineAccent, hero.headlineBottom].map((line, i) => (
            <motion.span
              key={line}
              initial={{ opacity: 0, y: reduce ? 0 : 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.12, ease: [0.2, 0.8, 0.2, 1] }}
              className="block"
            >
              <span className={i === 1 ? "text-adr" : "text-metal"}>{line}</span>
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-7 max-w-xl text-base leading-relaxed text-alu/85 sm:text-lg"
        >
          {hero.intro}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <Button variant="primary" onClick={() => openBooking()}>
            <CalendarCheck size={16} /> Service-Termin buchen
          </Button>
          <Button variant="outline" href={`tel:${company.phoneHref}`}>
            <Phone size={16} /> {company.phoneDisplay}
          </Button>
        </motion.div>

        {/* Hero-Kennzahlen */}
        <motion.dl
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          className="mt-14 grid max-w-2xl grid-cols-1 gap-px overflow-hidden rounded-xl border border-alu-line/70 sm:grid-cols-3"
        >
          {hero.stats.map((s) => (
            <div key={s.label} className="bg-stahl/40 px-5 py-4">
              <dt className="font-display text-2xl font-bold text-adr">{s.value}</dt>
              <dd className="mt-1 text-xs leading-snug text-alu/70">{s.label}</dd>
            </div>
          ))}
        </motion.dl>
      </div>

      {/* Scroll-Hinweis */}
      {!reduce && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 font-mono text-[0.65rem] uppercase tracking-ultra text-alu-dark sm:flex"
        >
          <MousePointer2 size={13} className="animate-scan-line" /> Szene drehbar · scrollen
        </motion.div>
      )}
    </section>
  );
}
