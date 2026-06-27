"use client";

import { MapPin, Phone, Mail, Clock, Navigation, CalendarCheck, PhoneOutgoing } from "lucide-react";
import { Reveal } from "../ui/Reveal";
import { SectionHeader } from "../ui/SectionHeader";
import { Button } from "../ui/Button";
import { company } from "@/content/site";
import { useBooking } from "../booking/BookingContext";

export function Kontakt() {
  const { openBooking, openCallback } = useBooking();
  const addr = company.address;
  const mapsQuery = encodeURIComponent(
    `${addr.street}, ${addr.zip} ${addr.city} ${addr.district}`,
  );
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;

  return (
    <section id="kontakt" className="relative scroll-mt-20 border-t border-alu-line/40 bg-graphit-2 py-24 md:py-32">
      <div className="container-edge">
        {/* CTA-Band */}
        <Reveal className="mb-16">
          <div className="metal-panel relative overflow-hidden rounded-3xl px-8 py-12 text-center md:px-16 md:py-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(242,165,22,0.16),transparent_60%)]" />
            <p className="eyebrow relative">Termin vereinbaren</p>
            <h2 className="relative mx-auto mt-4 max-w-2xl text-3xl leading-tight sm:text-4xl md:text-5xl">
              Tank prüfen, Bremse warten, <span className="text-adr">Aufbau planen.</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-alu/80">
              Buchen Sie online einen Service-Termin oder rufen Sie uns direkt an — wir bestätigen
              kurzfristig.
            </p>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button variant="primary" onClick={() => openBooking()}>
                <CalendarCheck size={16} /> Service-Termin buchen
              </Button>
              <Button variant="outline" onClick={() => openCallback()}>
                <PhoneOutgoing size={16} /> Rückruf anfordern
              </Button>
            </div>
          </div>
        </Reveal>

        <SectionHeader
          index="06"
          eyebrow="Kontakt"
          title={
            <>
              Direkt aus <span className="text-adr">Lunzenau.</span>
            </>
          }
          intro="Wir sind telefonisch, per E-Mail oder vor Ort für Sie da — während unserer Sprechzeiten."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Kontaktdaten */}
          <div className="lg:col-span-5">
            <ul className="space-y-4">
              <ContactRow icon={Phone} label="Telefon" href={`tel:${company.phoneHref}`} value={company.phoneDisplay} />
              <ContactRow icon={Mail} label="E-Mail" href={`mailto:${company.email}`} value={company.email} />
              <li className="metal-panel flex items-start gap-4 rounded-xl px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-adr/10 text-adr">
                  <MapPin size={18} />
                </span>
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-alu-dark">Adresse</p>
                  <p className="mt-1 text-sm text-papier">
                    {addr.street}
                    <br />
                    {addr.zip} {addr.city} {addr.district}
                  </p>
                </div>
              </li>
              <li className="metal-panel flex items-start gap-4 rounded-xl px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-adr/10 text-adr">
                  <Clock size={18} />
                </span>
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-alu-dark">Sprechzeiten</p>
                  <div className="mt-1 space-y-0.5 text-sm text-papier">
                    {company.hours.map((h) => (
                      <p key={h.day} className="flex justify-between gap-6">
                        <span className="text-alu/70">{h.day}</span>
                        <span>{h.time}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </li>
            </ul>
          </div>

          {/* Karten-Panel */}
          <div className="lg:col-span-7">
            <div className="metal-panel relative h-full min-h-[320px] overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-grid-fine bg-[size:36px_36px] opacity-30" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(242,165,22,0.14),transparent_55%)]" />
              {/* Standort-Marker */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="relative mx-auto flex h-12 w-12 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-adr/40" />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-adr text-graphit">
                    <MapPin size={22} />
                  </span>
                </span>
                <p className="mt-4 font-mono text-xs uppercase tracking-ultra text-papier">
                  {addr.city} · {addr.district}
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 border-t border-alu-line/70 bg-graphit/70 px-5 py-4 backdrop-blur-sm">
                <p className="font-mono text-xs text-alu-dark">
                  {addr.street}, {addr.zip} {addr.city}
                </p>
                <Button variant="outline" href={directions} target="_blank" rel="noopener noreferrer" className="!px-4 !py-2">
                  <Navigation size={14} /> Route
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({
  icon: Icon,
  label,
  href,
  value,
}: {
  icon: typeof Phone;
  label: string;
  href: string;
  value: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="metal-panel metal-panel-hover flex items-center gap-4 rounded-xl px-5 py-4"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-adr/10 text-adr">
          <Icon size={18} />
        </span>
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-alu-dark">{label}</p>
          <p className="mt-1 text-sm text-papier">{value}</p>
        </div>
      </a>
    </li>
  );
}
