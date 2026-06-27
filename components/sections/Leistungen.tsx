"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Truck, Boxes, Wrench, ShieldCheck, ArrowUpRight } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Stagger } from "../ui/Reveal";
import { leistungen } from "@/content/site";
import { useBooking } from "../booking/BookingContext";

const icons = [Truck, Boxes, Wrench, ShieldCheck];

export function Leistungen() {
  const reduce = useReducedMotion();
  const { openBooking } = useBooking();

  return (
    <section id="leistungen" className="relative scroll-mt-20 border-t border-alu-line/40 py-24 md:py-32">
      <div className="container-edge">
        <SectionHeader
          index="01"
          eyebrow="Leistungen"
          title={
            <>
              Vier Kompetenzen, <span className="text-adr">ein Werk.</span>
            </>
          }
          intro="Von der ersten Schweißnaht bis zur wiederkehrenden Prüfung — Fertigung, Aufbau und Service greifen bei uns nahtlos ineinander."
        />

        <Stagger className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" gap={0.08}>
          {leistungen.map((item, i) => {
            const Icon = icons[i];
            return (
              <motion.article
                key={item.id}
                variants={{
                  hidden: { opacity: 0, y: reduce ? 0 : 30 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] } },
                }}
                className="metal-panel metal-panel-hover group flex flex-col rounded-2xl p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-adr/10 text-adr transition group-hover:bg-adr group-hover:text-graphit">
                    <Icon size={20} />
                  </span>
                  <span className="font-mono text-xs text-alu-dark">{item.code}</span>
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-papier">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-alu/75">{item.summary}</p>
                <ul className="mt-4 space-y-1.5">
                  {item.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 font-mono text-xs text-alu/70">
                      <span className="h-1 w-1 rounded-full bg-adr" /> {p}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => openBooking(item.id === "service" ? "wartung" : "aufbau")}
                  className="mt-6 inline-flex items-center gap-1 self-start font-mono text-xs uppercase tracking-widest text-adr opacity-0 transition group-hover:opacity-100"
                >
                  Anfragen <ArrowUpRight size={13} />
                </button>
              </motion.article>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}
