import Link from "next/link";
import { Cylinder, Phone, Mail, MapPin } from "lucide-react";
import { site } from "@/config/site";
import { services } from "@/config/services";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-steel-950">
      <div className="container-page py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Marke */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-steel-950">
                <Cylinder className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold text-white">
                Krebs <span className="text-amber-400">Tanksysteme</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-steel-400">
              {site.tagline}. {site.trust.whg} – {site.trust.tuv}.
            </p>
          </div>

          {/* Leistungen */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-steel-300">
              Leistungen
            </h3>
            <ul className="space-y-2 text-sm text-steel-400">
              {services.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <a href="#leistungen" className="transition-colors hover:text-amber-400">
                    {s.station}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-steel-300">
              Schnellzugriff
            </h3>
            <ul className="space-y-2 text-sm text-steel-400">
              <li><a href="#ablauf" className="hover:text-amber-400">Ablauf</a></li>
              <li><a href="#warum" className="hover:text-amber-400">Warum wir</a></li>
              <li><a href="#faq" className="hover:text-amber-400">FAQ</a></li>
              <li><a href="#anfrage" className="hover:text-amber-400">Anfrage / Termin</a></li>
              <li><a href="#kontakt" className="hover:text-amber-400">Kontakt</a></li>
            </ul>
          </div>

          {/* Kontakt */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-steel-300">
              Kontakt
            </h3>
            <ul className="space-y-3 text-sm text-steel-400">
              <li>
                <a href={site.phone.href} className="flex items-center gap-2 hover:text-amber-400">
                  <Phone className="h-4 w-4 text-amber-400" /> {site.phone.display}
                </a>
              </li>
              <li>
                <a href={`mailto:${site.email}`} className="flex items-center gap-2 hover:text-amber-400">
                  <Mail className="h-4 w-4 text-amber-400" /> {site.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-none text-amber-400" />
                <span>
                  {site.address.street}, {site.address.zip} {site.address.city}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-steel-500 sm:flex-row">
          <p>© {year} {site.name}. Alle Rechte vorbehalten.</p>
          <nav className="flex gap-6">
            <Link href="/impressum" className="hover:text-amber-400">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-amber-400">Datenschutz</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
