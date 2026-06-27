import type { Metadata } from "next";
import { LegalShell } from "@/components/layout/LegalShell";
import { company } from "@/content/site";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  robots: { index: false, follow: true },
};

export default function DatenschutzPage() {
  return (
    <LegalShell title="Datenschutz">
      <p className="rounded-lg border border-adr/40 bg-adr/5 p-4 font-mono text-xs text-alu/80">
        Diese Datenschutzerklärung ist eine Grundlage und muss vor der Veröffentlichung an die
        tatsächlich eingesetzten Dienste (Hosting, E-Mail-Versand, ggf. Analyse) angepasst und
        rechtlich geprüft werden.
      </p>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">1. Verantwortlicher</h2>
        <p className="mt-3">
          {company.legalName}
          <br />
          {company.address.street}, {company.address.zip} {company.address.city}{" "}
          {company.address.district}
          <br />
          Telefon: {company.phoneDisplay} · E-Mail: {company.email}
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">2. Hosting</h2>
        <p className="mt-3">
          Diese Website wird bei einem Dienstleister gehostet. Beim Aufruf werden technisch
          notwendige Daten (z. B. IP-Adresse, Datum und Uhrzeit, abgerufene Seite) in Server-Logs
          verarbeitet. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (sicherer, stabiler Betrieb).
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">
          3. Termin- und Rückrufanfragen
        </h2>
        <p className="mt-3">
          Wenn Sie über das Buchungsformular einen Termin anfragen oder einen Rückruf anfordern,
          verarbeiten wir die von Ihnen angegebenen Daten (z. B. Name, Firma, Telefon, E-Mail,
          Fahrzeug- und Termindaten), um Ihre Anfrage zu bearbeiten und Sie zu kontaktieren.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und lit. f DSGVO. Die Übermittlung erfolgt per
          E-Mail an uns. Die Daten werden gelöscht, sobald sie für den Zweck nicht mehr erforderlich
          sind und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">4. Ihre Rechte</h2>
        <p className="mt-3">
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit und Widerspruch sowie das Recht, sich bei einer
          Datenschutz-Aufsichtsbehörde zu beschweren. Wenden Sie sich dazu an die oben genannten
          Kontaktdaten.
        </p>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-papier">5. Keine Weitergabe</h2>
        <p className="mt-3">
          Eine Weitergabe Ihrer Daten an Dritte erfolgt nur, soweit dies zur Vertragserfüllung
          erforderlich oder gesetzlich vorgeschrieben ist (z. B. an eingesetzte Auftragsverarbeiter
          wie den E-Mail-Dienstleister).
        </p>
      </section>
    </LegalShell>
  );
}
