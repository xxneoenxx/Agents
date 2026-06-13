import { MapPin, Phone, Mail, Navigation } from "lucide-react";
import { restaurant, mapsQuery } from "@/lib/restaurant";
import { Reveal } from "./ui/Reveal";

export function LocationMap() {
  // Mit API-Key wird die offizielle Embed-API genutzt, sonst die
  // schlüssellose Variante (funktioniert ebenfalls ohne Konfiguration).
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const embedSrc = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${mapsQuery}&language=de`
    : `https://maps.google.com/maps?q=${mapsQuery}&hl=de&z=15&output=embed`;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;

  return (
    <section id="kontakt" className="section">
      <div className="container-x">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Reveal>
            <span className="eyebrow">So findest du uns</span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-3xl font-bold text-bark sm:text-4xl">
              Anfahrt & Kontakt
            </h2>
          </Reveal>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <div className="flex h-full flex-col gap-4">
              <ContactCard icon={MapPin} title="Adresse">
                {restaurant.name}
                <br />
                {restaurant.address.street}
                <br />
                {restaurant.address.zip} {restaurant.address.city}
              </ContactCard>

              <ContactCard
                icon={Phone}
                title="Telefon"
                href={`tel:${restaurant.contact.phoneHref}`}
              >
                {restaurant.contact.phoneDisplay}
              </ContactCard>

              <ContactCard
                icon={Mail}
                title="E-Mail"
                href={`mailto:${restaurant.contact.email}`}
              >
                {restaurant.contact.email}
              </ContactCard>

              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost mt-auto"
              >
                <Navigation className="h-5 w-5" /> Route planen
              </a>
            </div>
          </Reveal>

          <Reveal direction="left">
            <div className="overflow-hidden rounded-2xl border border-bark/10 shadow-card">
              <iframe
                title={`Standort ${restaurant.name} auf Google Maps`}
                src={embedSrc}
                width="100%"
                height="100%"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[320px] w-full sm:h-[440px]"
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
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-copper/10 text-copper">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-sm font-semibold uppercase tracking-wide text-bark/50">
          {title}
        </span>
        <span className="mt-0.5 block font-medium text-bark">{children}</span>
      </span>
    </>
  );

  const className =
    "flex items-start gap-4 rounded-2xl border border-bark/10 bg-white/70 p-5 shadow-card transition";

  if (href) {
    return (
      <a href={href} className={`${className} hover:-translate-y-0.5 hover:border-copper`}>
        {inner}
      </a>
    );
  }
  return <div className={className}>{inner}</div>;
}
