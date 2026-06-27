import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/LegalShell";
import { company } from "@/content/site";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false, follow: true },
};

export default function ImpressumPage() {
  return (
    <LegalShell title="Impressum">
      <section>
        <h2 className="font-display text-lg font-semibold text-papier">Angaben gemäß § 5 DDG</h2>
        <p className="mt-3">
          {company.legalName}
          <br />
          {company.address.street}
          <br />
          {company.address.zip} {company.address.city} {company.address.district}
          <br />
          {company.address.country}
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">Vertreten durch</h2>
        <p className="mt-3">Geschäftsführer: {company.managingDirectors.join(", ")}</p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">Kontakt</h2>
        <p className="mt-3">
          Telefon:{" "}
          <a href={`tel:${company.phoneHref}`} className="text-adr hover:underline">
            {company.phoneDisplay}
          </a>
          <br />
          E-Mail:{" "}
          <a href={`mailto:${company.email}`} className="text-adr hover:underline">
            {company.email}
          </a>
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">Registereintrag</h2>
        <p className="mt-3">
          Eintragung im Handelsregister
          <br />
          Registergericht: {company.registerCourt}
          <br />
          Registernummer: {company.hrb}
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">Umsatzsteuer-ID</h2>
        <p className="mt-3 text-alu/70">
          [Bitte ergänzen: Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG.]
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">
          Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
        </h2>
        <p className="mt-3">
          {company.managingDirectors[0]}
          <br />
          {company.address.street}, {company.address.zip} {company.address.city}
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">EU-Streitschlichtung</h2>
        <p className="mt-3">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-adr hover:underline"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse finden Sie oben im Impressum.
        </p>
        <p className="mt-3">
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>

      <p className="rounded-lg border border-alu-line/60 bg-graphit-2 p-4 font-mono text-xs text-alu-dark">
        Hinweis für die Übergabe: Bitte rechtliche Angaben (z. B. USt-IdNr.) vor
        Veröffentlichung durch den Mandanten prüfen und ergänzen lassen.
      </p>
    </LegalShell>
  );
}
