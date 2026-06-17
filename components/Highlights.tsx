"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  UtensilsCrossed,
  Beer,
  Disc3,
  BedDouble,
  type LucideIcon,
} from "lucide-react";
import { highlights } from "@/lib/restaurant";

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed,
  Beer,
  Disc3,
  BedDouble,
};

export function Highlights() {
  const reduce = useReducedMotion();

  return (
    <section id="erlebnis" className="section bg-sand/60">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="eyebrow"
          >
            Mehr als ein Restaurant
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-3xl font-bold text-bark sm:text-4xl"
          >
            Ein Erlebnis für alle Sinne
          </motion.h2>
        </div>

        <motion.div
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12 } },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {highlights.map((h) => {
            const Icon = iconMap[h.icon] ?? UtensilsCrossed;
            return (
              <motion.article
                key={h.title}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                whileHover={reduce ? undefined : { y: -8 }}
                className="group card flex flex-col items-start"
              >
                <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-copper/10 text-copper transition-colors duration-300 group-hover:bg-copper group-hover:text-cream">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="text-xl font-semibold text-bark">{h.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bark/70">
                  {h.text}
                </p>
              </motion.article>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
