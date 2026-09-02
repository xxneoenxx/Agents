import { Phone, Mail, MapPin, Printer, Layers } from "lucide-react";
import { company, fullAddress } from "@/lib/elmtech";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-white/10 bg-graphite">
      <div className="container-x grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white">
              <Layers className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold">Elmtech</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-steel-400">
            {company.name} – maßgefertigte Dämm- und Fassadenelemente seit {company.foundedYear}.
            Familienunternehmen in zweiter Generation.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Kontakt</h4>
          <ul className="space-y-3 text-sm text-steel-200">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan" /> {fullAddress}
            </li>
            <li>
              <a href={`tel:${company.contact.phoneHref}`} className="flex items-center gap-2.5 transition hover:text-cyan">
                <Phone className="h-4 w-4 text-cyan" /> {company.contact.phoneDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Printer className="h-4 w-4 text-cyan" /> {company.contact.faxDisplay}
            </li>
            <li>
              <a href={`mailto:${company.contact.email}`} className="flex items-center gap-2.5 transition hover:text-cyan">
                <Mail className="h-4 w-4 text-cyan" /> {company.contact.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Leistungen</h4>
          <ul className="space-y-2 text-sm text-steel-200">
            <li>Schallschutz-Elemente</li>
            <li>Einbruchschutz-Elemente</li>
            <li>Energieeffiziente Dämmung</li>
            <li>Brandschutz-Elemente</li>
            <li>Sonderkonstruktionen</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Navigation</h4>
          <ul className="space-y-2 text-sm text-steel-200">
            <li><a href="#leistungen" className="transition hover:text-cyan">Leistungen</a></li>
            <li><a href="#aufbau" className="transition hover:text-cyan">Aufbau</a></li>
            <li><a href="#produkte" className="transition hover:text-cyan">Produkte</a></li>
            <li><a href="#unternehmen" className="transition hover:text-cyan">Unternehmen</a></li>
            <li><a href="#kontakt" className="transition hover:text-cyan">Kontakt</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-6 text-xs text-steel-400 sm:flex-row">
          <p>© {year} {company.name}. Alle Rechte vorbehalten.</p>
          <p className="flex gap-4">
            <a href="#" className="transition hover:text-cyan">Impressum</a>
            <a href="#" className="transition hover:text-cyan">Datenschutz</a>
            <a href="#" className="transition hover:text-cyan">AGB</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
