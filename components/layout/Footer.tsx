import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { company, nav } from "@/content/site";

export function Footer() {
  return (
    <footer className="border-t border-alu-line/70 bg-graphit-2">
      <div className="container-edge grid grid-cols-1 gap-10 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-adr font-display text-base font-extrabold text-graphit">
              N
            </span>
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-papier">
              Niemeier Fahrzeugwerke
            </span>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-alu/70">
            {company.tagline}. Tankfahrzeugbau, Metallbau und Nutzfahrzeug-Service aus einer Hand —
            in Lunzenau, Sachsen.
          </p>
        </div>

        <div className="md:col-span-3">
          <p className="eyebrow-muted mb-4">Navigation</p>
          <ul className="space-y-2.5">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-sm text-alu/80 transition hover:text-adr">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4">
          <p className="eyebrow-muted mb-4">Kontakt</p>
          <ul className="space-y-3 text-sm text-alu/80">
            <li className="flex items-start gap-3">
              <MapPin size={16} className="mt-0.5 shrink-0 text-adr" />
              <span>
                {company.address.street}
                <br />
                {company.address.zip} {company.address.city} {company.address.district}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={16} className="shrink-0 text-adr" />
              <a href={`tel:${company.phoneHref}`} className="hover:text-adr">
                {company.phoneDisplay}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={16} className="shrink-0 text-adr" />
              <a href={`mailto:${company.email}`} className="hover:text-adr">
                {company.email}
              </a>
            </li>
            <li className="flex items-start gap-3">
              <Clock size={16} className="mt-0.5 shrink-0 text-adr" />
              <span>
                {company.hours.map((h) => (
                  <span key={h.day} className="block">
                    {h.day}: {h.time}
                  </span>
                ))}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-alu-line/50">
        <div className="container-edge flex flex-col items-center justify-between gap-3 py-5 text-xs text-alu-dark sm:flex-row">
          <p className="font-mono">
            © {new Date().getFullYear()} {company.legalName}
          </p>
          <div className="flex items-center gap-5 font-mono">
            <Link href="/impressum" className="transition hover:text-adr">
              Impressum
            </Link>
            <Link href="/datenschutz" className="transition hover:text-adr">
              Datenschutz
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
