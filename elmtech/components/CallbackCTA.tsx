"use client";

import { motion } from "framer-motion";
import { PhoneCall, Phone, Clock } from "lucide-react";
import { company } from "@/lib/elmtech";
import { useCallbackModal } from "./callback/CallbackProvider";

export function CallbackCTA() {
  const { open } = useCallbackModal();

  return (
    <section id="rueckruf" className="section">
      <div className="container-x">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-deep/40 via-graphite-card to-graphite p-8 sm:p-12"
        >
          {/* dekorative Wellen */}
          <div aria-hidden className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
          <div aria-hidden className="absolute -bottom-16 left-1/3 h-56 w-56 rounded-full bg-cyan/15 blur-3xl" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <span className="eyebrow"><PhoneCall className="h-4 w-4" /> Rückruf-Service</span>
              <h2 className="text-3xl font-bold sm:text-4xl">
                Wir rufen Sie zurück – zu Ihrer Wunschzeit
              </h2>
              <p className="mt-4 max-w-xl text-steel-200">
                Wählen Sie Ihr Anliegen und ein passendes Zeitfenster. Unsere Technik-Beratung
                meldet sich verlässlich bei Ihnen – ohne Warteschleife, ohne Verkaufsdruck.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-steel-400">
                <Clock className="h-4 w-4 text-cyan" /> Erreichbar {company.businessHours}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => open()} className="btn-primary w-full justify-center !py-4 text-base">
                <PhoneCall className="h-5 w-5" /> Rückruf vereinbaren
              </button>
              <a
                href={`tel:${company.contact.phoneHref}`}
                className="btn-ghost w-full justify-center !py-4 text-base"
              >
                <Phone className="h-5 w-5" /> {company.contact.phoneDisplay}
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
