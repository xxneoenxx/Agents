"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Was kostet die Demontage eines Heizöltanks?",
    a: "Die Kosten hängen von Tankart, Größe, Zugänglichkeit und Restmengen ab. Nach einer kurzen Begutachtung – telefonisch oder vor Ort – erhalten Sie von uns ein transparentes Festpreis-Angebot ohne versteckte Kosten.",
  },
  {
    q: "Übernehmen Sie auch die Entsorgung und die Behördenmeldung?",
    a: "Ja. Wir entsorgen Restheizöl, Ölschlamm, Reinigungsmittel sowie alle Materialien fachgerecht, erstellen die erforderlichen Entsorgungsnachweise und übernehmen die Anzeige bzw. Abmeldung bei der zuständigen Unteren Wasserbehörde.",
  },
  {
    q: "Welche Tankarten demontieren Sie?",
    a: "Wir demontieren PE-/Kunststofftanks, GFK-Tanks und Stahltanks – sowohl im Keller bzw. Aufstellraum als auch erdverlegte Tanks. Die Zerlegung erfolgt platzsparend direkt vor Ort.",
  },
  {
    q: "Kann ein neuer Tank durch enge Kellertüren eingebracht werden?",
    a: "Ja. Wir montieren standortgefertigte Haase Kellertanks, die aus Einzelteilen direkt im Aufstellraum aufgebaut werden – ideal bei engen Zugängen und Türen.",
  },
  {
    q: "Lohnt sich ein Wärmespeicher beim Heizungstausch?",
    a: "In vielen Fällen ja. Ein standortgefertigter Haase Wärmespeicher erhöht die Effizienz moderner Heizsysteme wie Wärmepumpe, Solar oder Holzheizung. Wir beraten Sie gern zur passenden Lösung.",
  },
  {
    q: "In welcher Region sind Sie tätig?",
    a: `Unser Sitz ist in ${site.address.city} (${site.address.region}). Wir sind in der gesamten Region für Sie im Einsatz – sprechen Sie uns einfach auf Ihren Standort an.`,
  },
];

function FaqItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-steel-900/50">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-display text-base font-semibold text-white sm:text-lg">{q}</span>
        <span
          className={cn(
            "grid h-8 w-8 flex-none place-items-center rounded-full border border-white/15 text-amber-400 transition-transform duration-300",
            isOpen && "rotate-45 bg-amber-500/10",
          )}
        >
          <Plus className="h-4 w-4" />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <p className="px-6 pb-6 text-sm leading-relaxed text-steel-400">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative bg-steel-900 py-24 lg:py-32">
      <div className="container-page relative">
        <SectionHeading
          eyebrow="Häufige Fragen"
          title={<>Antworten, bevor Sie <span className="text-gradient">fragen</span></>}
          subtitle="Sie haben eine andere Frage? Rufen Sie uns an – wir beraten Sie persönlich und unverbindlich."
        />

        <div className="mx-auto mt-14 max-w-3xl space-y-4">
          {faqs.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} isOpen={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="text-steel-300">Noch Fragen offen?</p>
          <Button href={site.phone.href} size="lg">
            Jetzt anrufen: {site.phone.display}
          </Button>
        </div>
      </div>
    </section>
  );
}
