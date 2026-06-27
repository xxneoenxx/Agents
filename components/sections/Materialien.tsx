"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SectionHeader } from "../ui/SectionHeader";
import { Stagger } from "../ui/Reveal";
import { materialien } from "@/content/site";

export function Materialien() {
  const reduce = useReducedMotion();
  return (
    <section id="material" className="relative scroll-mt-20 border-t border-alu-line/40 py-24 md:py-32">
      <div className="container-edge">
        <SectionHeader
          index="03"
          eyebrow="Werkstoffe"
          title={
            <>
              Drei Werkstoffe, <span className="text-adr">präzise verarbeitet.</span>
            </>
          }
          intro="Schneiden, kanten, runden, schweißen, lackieren — wir verarbeiten Bleche und Profile aus drei Werkstoffen für jeden Einsatz."
        />

        <Stagger className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3" gap={0.1}>
          {materialien.map((m) => (
            <motion.div
              key={m.name}
              variants={{
                hidden: { opacity: 0, y: reduce ? 0 : 28 },
                show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } },
              }}
              className="metal-panel metal-panel-hover overflow-hidden rounded-2xl"
            >
              {/* Datenblatt-Kopf */}
              <div className="flex items-center justify-between border-b border-alu-line/70 px-6 py-4">
                <h3 className="font-display text-xl font-semibold text-papier">{m.name}</h3>
                <span className="font-mono text-xs text-alu-dark">DB-{m.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="bg-alu-brushed/[0.02] px-6 py-6">
                <p className="eyebrow mb-3">{m.note}</p>
                <p className="text-sm leading-relaxed text-alu/80">{m.detail}</p>
                <div className="mt-5 flex items-center justify-between border-t border-alu-line/50 pt-4">
                  <span className="font-mono text-xs uppercase tracking-widest text-alu-dark">
                    Spezifikation
                  </span>
                  <span className="font-mono text-xs text-adr">{m.spec}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </Stagger>

        {/* Prozess-Stichworte als Laufband-Optik */}
        <div className="mt-10 overflow-hidden rounded-xl border border-alu-line/60 bg-graphit-2 py-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 font-mono text-xs uppercase tracking-ultra text-alu-dark">
            {["Schneiden", "Kanten", "Runden", "Schweißen", "Lackieren"].map((w, i) => (
              <span key={w} className="flex items-center gap-8">
                {i > 0 && <span className="text-adr">/</span>}
                {w}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
