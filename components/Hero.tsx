"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import { Phone, CalendarDays, MapPin } from "lucide-react";
import { restaurant, fullAddress } from "@/lib/restaurant";
import { LiveStatusBadge } from "./LiveStatusBadge";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Parallax: Hintergrund bewegt sich langsamer als der Vordergrund.
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      id="hauptinhalt"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden"
    >
      {/* Hintergrund mit Parallax */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-bark via-bark-light to-forest" />
        {/* dekorative, animierte Lichtflecken */}
        <motion.div
          aria-hidden
          className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-copper/30 blur-3xl"
          animate={reduce ? undefined : { x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-gold/20 blur-3xl"
          animate={reduce ? undefined : { x: [0, -30, 0], y: [0, -20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.55))]" />
      </motion.div>

      <motion.div
        style={{ y: textY, opacity }}
        className="container-x relative pt-28 pb-16 text-center text-cream"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 flex justify-center"
        >
          <LiveStatusBadge />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-gold"
        >
          {restaurant.tagline} · seit {restaurant.foundedYear}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto max-w-4xl text-4xl font-bold leading-[1.1] sm:text-6xl lg:text-7xl"
        >
          Bauernhof zum<br />
          <span className="text-gold">Silberbergwerk</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-cream/85"
        >
          {restaurant.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a href="#reservieren" className="btn-primary w-full sm:w-auto">
            <CalendarDays className="h-5 w-5" /> Online Tisch reservieren
          </a>
          <a
            href={`tel:${restaurant.contact.phoneHref}`}
            className="btn-secondary w-full border-cream/30 !bg-cream/10 !text-cream hover:!border-gold hover:!text-gold sm:w-auto"
          >
            <Phone className="h-5 w-5" /> {restaurant.contact.phoneDisplay}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-8 flex items-center justify-center gap-2 text-sm text-cream/70"
        >
          <MapPin className="h-4 w-4 text-gold" />
          {fullAddress}
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
        <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-cream/40 p-1.5">
          <motion.span
            className="h-2 w-1 rounded-full bg-cream/70"
            animate={reduce ? undefined : { y: [0, 10, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}
