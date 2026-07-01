import type { Metadata } from "next";
import { LegalShell, LegalSection, Placeholder } from "@/components/legal/LegalShell";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false, follow: true },
};

export default function ImpressumPage() {
  return (
    <LegalShell title="Impressum">
      <p className="text-sm text-amber-300/90">
        Hinweis: Dieses Impressum enthält Platzhalter (gelb markiert). Bitte vor Veröffentlichung
        durch die korrekten, rechtlich verbindlichen Angaben des Betreibers ersetzen.
      </p>

      <LegalSection heading="Angaben gemäß § 5 DDG / § 5 TMG">
        <p>
          {site.legalName}
          <br />
          Inhaber: <Placeholder>Vorname Nachname (bitte ergänzen)</Placeholder>
          <br />
          {site.address.street}
          <br />
          {site.address.zip} {site.address.city}
        </p>
      </LegalSection>

      <LegalSection heading="Kontakt">
        <p>
          Telefon: {site.phone.display}
          <br />
          Mobil: {site.mobile.display}
          <br />
          E-Mail: {site.email}
        </p>
      </LegalSection>

      <LegalSection heading="Umsatzsteuer-ID">
        <p>
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
          <br />
          <Placeholder>USt-IdNr. bitte ergänzen</Placeholder>
        </p>
      </LegalSection>

      <LegalSection heading="Berufsrechtliche Angaben / Zertifizierung">
        <p>
          {site.trust.whg}. {site.trust.tuv}.
          <br />
          Überwachungs-/Zertifikatsnummer: <Placeholder>bitte ergänzen</Placeholder>
        </p>
      </LegalSection>

      <LegalSection heading="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>
          <Placeholder>Vorname Nachname, Anschrift wie oben</Placeholder>
        </p>
      </LegalSection>

      <LegalSection heading="EU-Streitschlichtung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            className="text-amber-400 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse finden Sie oben im Impressum.
        </p>
      </LegalSection>

      <LegalSection heading="Verbraucherstreitbeilegung / Universalschlichtungsstelle">
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </LegalSection>

      <LegalSection heading="Haftung für Inhalte">
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach
          den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter
          jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
