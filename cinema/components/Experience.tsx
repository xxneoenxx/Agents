"use client";

import { motion } from "framer-motion";
import { Volume2, Armchair, MonitorPlay, Popcorn, type LucideIcon } from "lucide-react";
import { experiences, stats } from "@/lib/cinema";
import { Reveal } from "./ui/Reveal";
import { CountUp } from "./ui/CountUp";

const iconMap: Record<string, LucideIcon> = {
  Volume2,
  Armchair,
  Projector: MonitorPlay,
  Popcorn,
};

export function Experience() {
  return (
    <section id="erlebnis" className="section">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">Warum CineStar</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-4xl sm:text-5xl">Großes Kino, das man fühlt</h2>
          </Reveal>
        </div>

        <motion.div
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {experiences.map((ex) => {
            const Icon = iconMap[ex.icon] ?? MonitorPlay;
            return (
              <motion.article
                key={ex.title}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
                }}
                whileHover={{ y: -8 }}
                className="group glass relative overflow-hidden p-6"
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-0" />
                <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 text-gold transition-colors duration-300 group-hover:bg-gold group-hover:text-ink">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="text-xl">{ex.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{ex.text}</p>
              </motion.article>
            );
          })}
        </motion.div>

        {/* Statistik-Band */}
        <Reveal delay={0.1}>
          <div className="mt-12 grid grid-cols-2 gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-8 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-4xl text-gradient-gold sm:text-5xl">
                  <CountUp end={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-sm text-white/55">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
