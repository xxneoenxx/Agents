"use client";

import { Phone, Smartphone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { site } from "@/config/site";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export function Contact() {
  const mapsSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    site.address.mapsQuery,
  )}&output=embed`;

  return (
    <section id="kontakt" className="relative bg-steel-900 py-24 lg:py-32">
      <div className="container-page relative">
        <SectionHeading
          eyebrow="Kontakt"
          title={<>Sprechen Sie uns <span className="text-gradient">direkt</span> an</>}
          subtitle="Persönlich, schnell und unkompliziert – wir freuen uns auf Ihre Anfrage."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {/* Kontaktdaten */}
          <Reveal>
            <div className="flex h-full flex-col gap-4">
              <a
                href={site.phone.href}
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-steel-950/50 p-5 transition-colors hover:border-amber-500/40"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Phone className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wider text-steel-500">Telefon</span>
                  <span className="text-lg font-semibold text-white group-hover:text-amber-400">
                    {site.phone.display}
                  </span>
                </span>
              </a>

              <a
                href={site.mobile.href}
                className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-steel-950/50 p-5 transition-colors hover:border-amber-500/40"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                  <Smartphone className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wider text-steel-500">Mobil</span>
                  <span className="text-lg font-semibold text-white group-hover:text-amber-400">
                    {site.mobile.display}
                  </span>
                </span>
              </a>

              <div className="grid gap-4 sm:grid-cols-2">
                <a
                  href={`mailto:${site.email}`}
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-steel-950/50 p-5 transition-colors hover:border-teal-500/40"
                >
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-teal-500/10 text-teal-400">
                    <Mail className="h-6 w-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-wider text-steel-500">E-Mail</span>
                    <span className="block truncate text-sm font-semibold text-white">{site.email}</span>
                  </span>
                </a>

                <a
                  href={site.whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-steel-950/50 p-5 transition-colors hover:border-teal-500/40"
                >
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-teal-500/10 text-teal-400">
                    <MessageCircle className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="block text-xs uppercase tracking-wider text-steel-500">WhatsApp</span>
                    <span className="text-sm font-semibold text-white">Nachricht senden</span>
                  </span>
                </a>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-steel-950/50 p-5">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-white/5 text-steel-200">
                  <MapPin className="h-6 w-6" />
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wider text-steel-500">Anschrift</span>
                  <span className="text-sm font-semibold text-white">
                    {site.address.street}
                    <br />
                    {site.address.zip} {site.address.city}
                  </span>
                </span>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-steel-950/50 p-5">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-white/5 text-steel-200">
                  <Clock className="h-6 w-6" />
                </span>
                <span className="w-full">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-steel-500">
                    Öffnungszeiten
                  </span>
                  <ul className="space-y-0.5 text-sm text-steel-200">
                    {site.hours.map((h) => (
                      <li key={h.days} className="flex justify-between gap-4">
                        <span className="text-steel-400">{h.days}</span>
                        <span className="font-medium">{h.time}</span>
                      </li>
                    ))}
                  </ul>
                </span>
              </div>
            </div>
          </Reveal>

          {/* Karte */}
          <Reveal delay={0.1}>
            <div className="h-full min-h-[420px] overflow-hidden rounded-3xl border border-white/10">
              <iframe
                title={`Standort ${site.name}`}
                src={mapsSrc}
                className="h-full w-full grayscale-[0.3]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{ minHeight: 420, border: 0 }}
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
