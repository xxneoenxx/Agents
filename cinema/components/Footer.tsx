import { Phone, Mail, MapPin, Film } from "lucide-react";
import { cinema, fullAddress } from "@/lib/cinema";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-ink-soft/60">
      <div className="container-x grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold text-ink">
              <Film className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl">CineStar Chemnitz</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            {cinema.fullName}. {cinema.halls} Säle, großes Kino und beste Unterhaltung
            mitten in der Galerie Roter Turm.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/80">Kontakt</h4>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /> {fullAddress}
            </li>
            <li>
              <a href={`tel:${cinema.contact.phoneHref}`} className="flex items-center gap-2.5 transition hover:text-gold">
                <Phone className="h-4 w-4 text-gold" /> {cinema.contact.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${cinema.contact.email}`} className="flex items-center gap-2.5 transition hover:text-gold">
                <Mail className="h-4 w-4 text-gold" /> {cinema.contact.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/80">Öffnungszeiten</h4>
          <p className="text-sm text-white/70">{cinema.openingHours}</p>
          <p className="mt-3 text-xs text-white/45">{cinema.boxOfficeNote}</p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/80">Navigation</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><a href="#programm" className="transition hover:text-gold">Programm</a></li>
            <li><a href="#erlebnis" className="transition hover:text-gold">Erlebnis</a></li>
            <li><a href="#aktionen" className="transition hover:text-gold">Aktionen</a></li>
            <li><a href="#kontakt" className="transition hover:text-gold">Anfahrt</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs text-white/45 sm:flex-row">
          <p>© {year} {cinema.fullName}. Alle Rechte vorbehalten.</p>
          <p className="flex gap-4">
            <a href="#" className="transition hover:text-gold">Impressum</a>
            <a href="#" className="transition hover:text-gold">Datenschutz</a>
            <a href="#" className="transition hover:text-gold">AGB</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
