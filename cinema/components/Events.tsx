"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { events } from "@/lib/cinema";
import { Reveal } from "./ui/Reveal";

export function Events() {
  const reduce = useReducedMotion();
  const marquee = ["Popcorn", "Dolby Atmos", "CineSneak", "Premiere", "3D", "CineLady", "Eventkino", "CineMen"];

  return (
    <section id="aktionen" className="section bg-ink-soft/50">
      {/* Lauftext */}
      <div className="relative mb-16 overflow-hidden border-y border-white/10 py-4">
        <motion.div
          className="flex w-max gap-10 whitespace-nowrap"
          animate={reduce ? undefined : { x: ["0%", "-50%"] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        >
          {[...marquee, ...marquee].map((word, i) => (
            <span key={i} className="flex items-center gap-10 font-display text-3xl text-white/15">
              {word} <Sparkles className="h-5 w-5 text-gold/40" />
            </span>
          ))}
        </motion.div>
      </div>

      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">Jede Woche neu</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-4xl sm:text-5xl">Unsere Aktionen</h2>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((ev, i) => (
            <Reveal key={ev.title} delay={i * 0.08}>
              <motion.div whileHover={{ y: -6 }} className="glass h-full p-6">
                <span className="inline-block rounded-full bg-crimson/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-crimson-soft">
                  {ev.tag}
                </span>
                <h3 className="mt-4 text-2xl">{ev.title}</h3>
                <p className="mt-2 text-sm text-white/55">{ev.text}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
