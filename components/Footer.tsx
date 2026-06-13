import { Phone, Mail, MapPin } from "lucide-react";
import { restaurant, fullAddress, openingHours, formatRange } from "@/lib/restaurant";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-bark text-cream/80">
      <div className="container-x grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <h3 className="font-serif text-xl font-bold text-cream">
            Bauernhof zum Silberbergwerk
          </h3>
          <p className="mt-1 text-sm uppercase tracking-[0.2em] text-gold">
            {restaurant.tagline}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-cream/65">
            {restaurant.description}
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cream">
            Kontakt
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {fullAddress}
            </li>
            <li>
              <a
                href={`tel:${restaurant.contact.phoneHref}`}
                className="flex items-center gap-2.5 transition hover:text-gold"
              >
                <Phone className="h-4 w-4 text-gold" />
                {restaurant.contact.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${restaurant.contact.email}`}
                className="flex items-center gap-2.5 transition hover:text-gold"
              >
                <Mail className="h-4 w-4 text-gold" />
                {restaurant.contact.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cream">
            Öffnungszeiten
          </h4>
          <ul className="space-y-1.5 text-sm">
            {openingHours.map((d) => (
              <li key={d.day} className="flex justify-between gap-4">
                <span className="text-cream/60">{d.short}</span>
                <span className="text-right text-cream/80">
                  {d.ranges.length === 0
                    ? "geschl."
                    : d.ranges.map((r) => formatRange(r)).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-cream">
            Navigation
          </h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#ueber-uns" className="transition hover:text-gold">Über uns</a></li>
            <li><a href="#erlebnis" className="transition hover:text-gold">Erlebnis</a></li>
            <li><a href="#speisekarte" className="transition hover:text-gold">Speisekarte</a></li>
            <li><a href="#oeffnungszeiten" className="transition hover:text-gold">Öffnungszeiten</a></li>
            <li><a href="#reservieren" className="transition hover:text-gold">Reservieren</a></li>
            <li><a href="#kontakt" className="transition hover:text-gold">Anfahrt</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs text-cream/55 sm:flex-row">
          <p>© {year} {restaurant.name}. Alle Rechte vorbehalten.</p>
          <p className="flex gap-4">
            <a href="#impressum" className="transition hover:text-gold">Impressum</a>
            <a href="#datenschutz" className="transition hover:text-gold">Datenschutz</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
