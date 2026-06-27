"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck, Phone, Gauge, ClipboardCheck, Settings, Hammer } from "lucide-react";
import { SectionHeader } from "../ui/SectionHeader";
import { Button } from "../ui/Button";
import { ImageSlot } from "../ui/ImageSlot";
import { serviceLeistungen, company } from "@/content/site";
import { useBooking } from "../booking/BookingContext";

const icons = [Gauge, ClipboardCheck, Settings, Hammer];

export function Service() {
  const reduce = useReducedMotion();
  const { openBooking } = useBooking();

  return (
    <section
      id="service"
      className="relative scroll-mt-20 border-t border-alu-line/40 bg-graphit-2 py-24 md:py-32"
    >
      <div className="container-edge grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeader
            index="04"
            eyebrow="Service & Prüfung"
            title={
              <>
                Damit Ihr Fuhrpark <span className="text-adr">auf der Straße bleibt.</span>
              </>
            }
            intro="Bremsenservice, Tankprüfungen, Wartung und Reparatur — planbar terminiert, fachgerecht ausgeführt, kurze Standzeiten."
          />

          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => openBooking()}>
              <CalendarCheck size={16} /> Termin buchen
            </Button>
            <Button variant="outline" href={`tel:${company.phoneHref}`}>
              <Phone size={16} /> Anrufen
            </Button>
          </div>

          <ImageSlot
            name="service"
            className="mt-8 hidden aspect-[4/3] rounded-2xl border border-alu-line/70 lg:block"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
          {serviceLeistungen.map((s, i) => {
            const Icon = icons[i];
            return (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: reduce ? 0 : 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
                className="metal-panel metal-panel-hover group flex flex-col rounded-2xl p-6"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-adr/10 text-adr transition group-hover:bg-adr group-hover:text-graphit">
                  <Icon size={20} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-papier">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-alu/75">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
