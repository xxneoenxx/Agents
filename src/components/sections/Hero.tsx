"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Phone, CalendarCheck, ShieldCheck, ChevronDown } from "lucide-react";
import { site } from "@/config/site";
import { Button } from "@/components/ui/Button";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
  loading: () => <StaticHeroVisual />,
});

/** Statischer, eleganter Fallback (Reduced-Motion / Ladephase / kein WebGL) */
function StaticHeroVisual() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="relative h-64 w-64 sm:h-80 sm:w-80">
        <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="absolute inset-8 rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-steel-300/30 to-steel-700/40 backdrop-blur" />
        <div className="absolute inset-x-16 inset-y-6 rounded-full bg-gradient-to-b from-steel-200 via-steel-400 to-steel-600 shadow-soft" />
        <div className="absolute inset-x-16 top-1/3 h-1 bg-amber-500/80" />
        <div className="absolute inset-x-16 top-2/3 h-1 bg-amber-500/80" />
      </div>
    </div>
  );
}

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section
      id="hauptinhalt"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-steel-950"
    >
      {/* Hintergrund-Atmosphäre */}
      <div className="pointer-events-none absolute inset-0 bg-grid-steel bg-[size:44px_44px] opacity-[0.5]" />
      <div className="pointer-events-none absolute inset-0 bg-radial-glow" />
      <div className="pointer-events-none absolute -left-40 top-0 h-[40rem] w-[40rem] rounded-full bg-teal-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[40rem] w-[40rem] rounded-full bg-amber-500/10 blur-[120px]" />

      {/* 3D-Szene (rechte Hälfte auf Desktop, Hintergrund auf Mobile) */}
      <div className="absolute inset-0 lg:left-1/3">
        {reduced ? <StaticHeroVisual /> : <HeroScene />}
      </div>

      {/* Inhalt */}
      <div className="container-page relative z-10 grid items-center gap-10 py-24 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-xl"
        >
          <span className="eyebrow mb-6">
            <ShieldCheck className="h-3.5 w-3.5" />
            {site.trust.whg}
          </span>

          <h1 className="font-display text-4xl font-extrabold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Heizöltank <span className="text-gradient">demontieren</span>,
            erneuern &amp; sicher entsorgen
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-steel-300">
            {site.claim} Von der fachgerechten Demontage über die Reinigung bis zur
            Montage moderner Haase Keller- und Wärmespeicher – alles aus einer Hand.
          </p>

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Button href="#anfrage" size="lg">
              <CalendarCheck className="h-5 w-5" />
              Kostenlos anfragen
            </Button>
            <Button href={site.phone.href} variant="outline" size="lg">
              <Phone className="h-5 w-5" />
              {site.phone.display}
            </Button>
          </div>

          {/* Trust-Punkte */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-steel-400">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-400" /> TÜV-Süd-überwacht
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-400" /> Entsorgungsnachweis inklusive
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-400" /> Festpreis-Angebot
            </span>
          </div>
        </motion.div>

        {/* Hinweis zur Interaktion mit der 3D-Szene (Desktop) */}
        <div className="hidden lg:block" aria-hidden>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="ml-auto max-w-[12rem] text-right text-xs uppercase tracking-widest text-steel-500"
          >
            Tippen Sie auf die Punkte, um die Leistungen zu entdecken
          </motion.p>
        </div>
      </div>

      {/* Scroll-Indikator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1.4 }, y: { repeat: Infinity, duration: 2 } }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-steel-500"
      >
        <ChevronDown className="h-6 w-6" />
      </motion.div>
    </section>
  );
}
