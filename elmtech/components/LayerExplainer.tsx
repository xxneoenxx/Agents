"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Layers, MousePointerClick } from "lucide-react";
import { layers } from "@/lib/elmtech";
import { Reveal } from "./ui/Reveal";

export function LayerExplainer() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-120px" });
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState<number | null>(null);

  // Auseinandergefahren, sobald sichtbar.
  const exploded = inView;

  return (
    <section id="aufbau" className="section bg-graphite-soft/60">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2">
        {/* 3D-Querschnitt */}
        <Reveal direction="right">
          <div
            ref={ref}
            className="relative mx-auto flex h-[360px] w-full max-w-md items-center justify-center"
            style={{ perspective: 1100 }}
          >
            <div
              className="relative h-56 w-64"
              style={{ transformStyle: "preserve-3d", transform: "rotateX(58deg) rotateZ(-32deg)" }}
            >
              {layers.map((layer, i) => {
                const gap = reduce ? 26 : 52;
                const z = exploded ? (i - 1) * gap : (i - 1) * 6;
                const lifted = hovered === i;
                return (
                  <motion.div
                    key={layer.key}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    className="absolute inset-0 rounded-xl border border-white/25 shadow-card"
                    style={{
                      background: `linear-gradient(135deg, ${layer.color}, ${layer.color}bb)`,
                      transformStyle: "preserve-3d",
                    }}
                    animate={{ translateZ: z + (lifted ? 22 : 0) }}
                    transition={{ type: "spring", stiffness: 120, damping: 18, delay: exploded ? i * 0.08 : 0 }}
                  >
                    <div className="flex h-full items-center justify-center">
                      <span className="font-display text-sm font-bold uppercase tracking-widest text-graphite/70">
                        {layer.name}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            <p className="absolute bottom-0 flex items-center gap-2 text-xs text-steel-400">
              <MousePointerClick className="h-4 w-4 text-cyan" /> Lage antippen zum Hervorheben
            </p>
          </div>
        </Reveal>

        {/* Beschreibung */}
        <div>
          <Reveal>
            <span className="eyebrow"><Layers className="h-4 w-4" /> Der Aufbau</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-3xl font-bold sm:text-4xl">Präzision in jeder Schicht</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 max-w-lg text-steel-200">
              Ein Elmtech-Verbundelement vereint mehrere Funktionsschichten zu einem
              hochbelastbaren Ganzen. Der mehrlagige Aufbau ist der Schlüssel zu Schall-,
              Wärme- und Brandschutz auf engstem Raum.
            </p>
          </Reveal>

          <ul className="mt-8 space-y-3">
            {layers.map((layer, i) => (
              <Reveal as="li" key={layer.key} delay={0.15 + i * 0.08}>
                <button
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ${
                    hovered === i ? "border-cyan/60 bg-white/[0.06]" : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <span
                    className="mt-1 h-5 w-5 shrink-0 rounded-md border border-white/30"
                    style={{ background: layer.color }}
                  />
                  <span>
                    <span className="block font-semibold">{layer.name}</span>
                    <span className="mt-0.5 block text-sm text-steel-400">{layer.desc}</span>
                  </span>
                </button>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
