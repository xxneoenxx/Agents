import { MapPin, Phone, Mail, Printer, Navigation, Truck } from "lucide-react";
import { company, fullAddress, mapsQuery } from "@/lib/elmtech";
import { Reveal } from "./ui/Reveal";

export function LocationMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const embedSrc = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${mapsQuery}&language=de`
    : `https://maps.google.com/maps?q=${mapsQuery}&hl=de&z=15&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;

  return (
    <section id="kontakt" className="section bg-graphite-soft/60">
      <div className="container-x">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">So erreichen Sie uns</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-3xl font-bold sm:text-4xl">Standort & Kontakt</h2>
          </Reveal>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <div className="flex h-full flex-col gap-4">
              <ContactCard icon={MapPin} title="Werk / Sitz">
                {company.name}
                <br />
                {company.address.street}
                <br />
                {company.address.zip} {company.address.city} / {company.address.district}
              </ContactCard>
              <ContactCard icon={Truck} title="Lieferadresse">
                {company.delivery.street}
                <br />
                {company.delivery.zip} {company.delivery.city}
              </ContactCard>
              <div className="grid gap-4 sm:grid-cols-2">
                <ContactCard icon={Phone} title="Telefon" href={`tel:${company.contact.phoneHref}`}>
                  {company.contact.phoneDisplay}
                </ContactCard>
                <ContactCard icon={Printer} title="Fax">
                  {company.contact.faxDisplay}
                </ContactCard>
              </div>
              <ContactCard icon={Mail} title="E-Mail" href={`mailto:${company.contact.email}`}>
                {company.contact.email}
              </ContactCard>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-auto">
                <Navigation className="h-5 w-5" /> Route planen
              </a>
            </div>
          </Reveal>

          <Reveal direction="left">
            <div className="relative h-full min-h-[360px] overflow-hidden rounded-3xl border border-white/10">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-brand-deep to-graphite p-6 text-center"
                id="map-fallback-link"
              >
                <MapPin className="h-10 w-10 text-cyan" />
                <span className="font-semibold">{company.name}</span>
                <span className="text-sm text-steel-200">{fullAddress}</span>
              </a>
              <iframe
                title={`Standort ${company.name} auf Google Maps`}
                src={embedSrc}
                width="100%"
                height="100%"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="relative z-20 h-full min-h-[360px] w-full"
                allowFullScreen
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ContactCard({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  const inner = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/10 text-cyan">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-wide text-steel-400">{title}</span>
        <span className="mt-0.5 block font-medium">{children}</span>
      </span>
    </>
  );
  const cls = "glass flex items-start gap-4 p-5";
  return href ? (
    <a href={href} className={`${cls} transition hover:-translate-y-0.5 hover:border-cyan/40`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
