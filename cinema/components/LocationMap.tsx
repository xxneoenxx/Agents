import { MapPin, Phone, Mail, Navigation, Clock } from "lucide-react";
import { cinema, fullAddress, mapsQuery } from "@/lib/cinema";
import { Reveal } from "./ui/Reveal";

export function LocationMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const embedSrc = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${mapsQuery}&language=de`
    : `https://maps.google.com/maps?q=${mapsQuery}&hl=de&z=16&output=embed`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;

  return (
    <section id="kontakt" className="section">
      <div className="container-x">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">So findest du uns</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-4xl sm:text-5xl">Anfahrt & Kontakt</h2>
          </Reveal>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <div className="flex h-full flex-col gap-4">
              <ContactCard icon={MapPin} title="Adresse">
                {cinema.fullName}
                <br />
                {cinema.address.street}, {cinema.address.zip} {cinema.address.city}
                <br />
                <span className="text-white/50">{cinema.address.extra}</span>
              </ContactCard>
              <ContactCard icon={Clock} title="Öffnungszeiten">
                {cinema.openingHours}
              </ContactCard>
              <ContactCard icon={Phone} title="Telefon" href={`tel:${cinema.contact.phoneHref}`}>
                {cinema.contact.phoneDisplay}
              </ContactCard>
              <ContactCard icon={Mail} title="E-Mail" href={`mailto:${cinema.contact.email}`}>
                {cinema.contact.email}
              </ContactCard>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn-gold mt-auto">
                <Navigation className="h-5 w-5" /> Route planen
              </a>
            </div>
          </Reveal>

          <Reveal direction="left">
            <div className="relative h-full min-h-[340px] overflow-hidden rounded-3xl border border-white/10">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-violet to-ink p-6 text-center"
                style={{ display: "flex" }}
                id="map-fallback-link"
              >
                <MapPin className="h-10 w-10 text-gold" />
                <span className="font-semibold">{cinema.name}</span>
                <span className="text-sm text-white/70">{fullAddress}</span>
              </a>
              <iframe
                title={`Standort ${cinema.name} auf Google Maps`}
                src={embedSrc}
                width="100%"
                height="100%"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="relative z-20 h-full min-h-[340px] w-full"
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
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-wide text-white/40">{title}</span>
        <span className="mt-0.5 block font-medium">{children}</span>
      </span>
    </>
  );
  const cls = "glass flex items-start gap-4 p-5";
  return href ? (
    <a href={href} className={`${cls} transition hover:-translate-y-0.5 hover:border-gold/40`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
