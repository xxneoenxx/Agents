"use client";

import { motion } from "framer-motion";
import {
  Ear,
  ShieldCheck,
  Leaf,
  Flame,
  Maximize2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { applications } from "@/lib/elmtech";
import { useCallbackModal } from "./callback/CallbackProvider";

const iconMap: Record<string, LucideIcon> = {
  Ear,
  ShieldCheck,
  Leaf,
  Flame,
  Maximize2,
  Sparkles,
};

export function Applications() {
  const { open } = useCallbackModal();

  return (
    <section id="leistungen" className="section">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="eyebrow"
          >
            Was unsere Elemente leisten
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-3xl font-bold sm:text-4xl"
          >
            Eine Lösung für jede Anforderung
          </motion.h2>
        </div>

        <motion.div
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {applications.map((app) => {
            const Icon = iconMap[app.icon] ?? Sparkles;
            return (
              <motion.button
                key={app.title}
                type="button"
                onClick={() => open(mapTopic(app.title))}
                variants={{
                  hidden: { opacity: 0, y: 30 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
                }}
                whileHover={{ y: -8 }}
                className="group glass relative overflow-hidden p-6 text-left"
              >
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-cyan transition-colors duration-300 group-hover:bg-brand group-hover:text-white">
                  <Icon className="h-7 w-7" />
                </span>
                <h3 className="text-xl font-semibold">{app.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-400">{app.text}</p>
                <span className="mt-4 inline-block text-xs font-semibold uppercase tracking-wider text-cyan opacity-0 transition-opacity group-hover:opacity-100">
                  Dazu beraten lassen →
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

// Ordnet einen Anwendungstitel dem passenden Rückruf-Anliegen zu.
function mapTopic(title: string): string {
  if (title.includes("Schall")) return "Schallschutz";
  if (title.includes("Einbruch")) return "Einbruchschutz";
  if (title.includes("Energie")) return "Energieeffizienz";
  if (title.includes("Brand")) return "Brandschutz";
  return "Allgemeine Anfrage";
}
