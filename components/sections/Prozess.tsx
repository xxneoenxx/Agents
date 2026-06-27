"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SectionHeader } from "../ui/SectionHeader";
import { prozess } from "@/content/site";

export function Prozess() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.4"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      id="fertigung"
      className="relative scroll-mt-20 border-t border-alu-line/40 bg-graphit-2 py-24 md:py-32"
    >
      <div className="container-edge">
        <SectionHeader
          index="02"
          eyebrow="Fertigung"
          title={
            <>
              Vom Blech zum <span className="text-adr">geprüften Tank.</span>
            </>
          }
          intro="Fünf Schritte, eine Linie. Jeder Tank durchläuft denselben kontrollierten Weg — vom Zuschnitt bis zur Abnahme."
        />

        <div ref={ref} className="relative mt-16 pl-2">
          {/* Vertikale Prozesslinie (scroll-getrieben) */}
          <div className="absolute left-[27px] top-2 hidden h-[calc(100%-1rem)] w-px bg-alu-line/50 md:block">
            <motion.div
              className="h-full w-px origin-top bg-gradient-to-b from-adr to-glut"
              style={{ scaleY: reduce ? 1 : lineScale }}
            />
          </div>

          <ol className="space-y-6 md:space-y-10">
            {prozess.map((p, i) => (
              <motion.li
                key={p.step}
                initial={{ opacity: 0, x: reduce ? 0 : -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                className="relative flex flex-col gap-4 md:flex-row md:items-center md:gap-8"
              >
                <div className="z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-adr/60 bg-graphit font-display text-lg font-bold text-adr">
                  {p.step}
                </div>
                <div className="metal-panel flex-1 rounded-xl p-5 md:flex md:items-center md:justify-between md:gap-6">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-papier">{p.title}</h3>
                    <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-alu/75">{p.desc}</p>
                  </div>
                  <span className="mt-3 inline-block shrink-0 rounded border border-alu-line px-3 py-1 font-mono text-xs text-adr md:mt-0">
                    {p.spec}
                  </span>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
