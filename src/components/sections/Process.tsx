"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PhoneCall, ClipboardList, Wrench, FileCheck } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

const steps = [
  {
    icon: PhoneCall,
    title: "1 · Kontakt & Beratung",
    text: "Sie schildern uns Ihr Anliegen telefonisch oder über das Anfrageformular. Wir beraten Sie unverbindlich.",
  },
  {
    icon: ClipboardList,
    title: "2 · Vor-Ort-Termin & Festpreis",
    text: "Wir begutachten Tank und Zugang vor Ort und erstellen ein transparentes Festpreis-Angebot.",
  },
  {
    icon: Wrench,
    title: "3 · Fachgerechte Ausführung",
    text: "Demontage, Reinigung, Sanierung oder Montage – sauber, termintreu und nach allen WHG-Vorgaben.",
  },
  {
    icon: FileCheck,
    title: "4 · Entsorgung & Nachweis",
    text: "Wir entsorgen alle Reststoffe ordnungsgemäß und übernehmen Nachweise sowie die Abmeldung bei der Behörde.",
  },
];

export function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 60%"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="ablauf" className="relative overflow-hidden bg-steel-900 py-24 lg:py-32">
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-teal-500/10 blur-[120px]" />
      <div className="container-page relative">
        <SectionHeading
          eyebrow="So läuft's ab"
          title={<>In vier Schritten zur <span className="text-gradient">fertigen Lösung</span></>}
          subtitle="Klar strukturiert, transparent kalkuliert und rechtssicher dokumentiert – ohne böse Überraschungen."
        />

        <div ref={ref} className="relative mx-auto mt-16 max-w-3xl">
          {/* Vertikale Linie */}
          <div className="absolute left-[27px] top-2 h-[calc(100%-1rem)] w-0.5 bg-white/10 sm:left-1/2 sm:-translate-x-1/2">
            <motion.div
              style={{ scaleY: lineScale }}
              className="h-full w-full origin-top bg-gradient-to-b from-amber-400 to-teal-400"
            />
          </div>

          <div className="space-y-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className={`relative flex items-start gap-5 sm:w-1/2 ${
                  i % 2 === 0 ? "sm:ml-0 sm:pr-12 sm:text-right" : "sm:ml-auto sm:pl-12"
                }`}
              >
                <div
                  className={`relative z-10 grid h-14 w-14 flex-none place-items-center rounded-2xl border border-amber-500/30 bg-steel-950 text-amber-400 shadow-glow ${
                    i % 2 === 0 ? "sm:order-2 sm:-mr-[55px]" : "sm:-ml-[55px]"
                  }`}
                >
                  <step.icon className="h-6 w-6" />
                </div>
                <div className={i % 2 === 0 ? "sm:order-1" : ""}>
                  <h3 className="font-display text-lg font-bold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-steel-400">{step.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
