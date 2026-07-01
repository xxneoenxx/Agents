import type { Metadata } from "next";
import { LegalShell, LegalSection, Placeholder } from "@/components/legal/LegalShell";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  robots: { index: false, follow: true },
};

export default function DatenschutzPage() {
  return (
    <LegalShell title="Datenschutzerklärung">
      <p className="text-sm text-amber-300/90">
        Hinweis: Dies ist eine an die Website angepasste Muster-Datenschutzerklärung mit Platzhaltern
        (gelb markiert). Bitte vor Veröffentlichung anwaltlich bzw. mit einem
        Datenschutz-Generator final prüfen und vervollständigen.
      </p>

      <LegalSection heading="1. Verantwortlicher">
        <p>
          Verantwortlich für die Datenverarbeitung auf dieser Website ist:
          <br />
          {site.legalName}
          <br />
          {site.address.street}, {site.address.zip} {site.address.city}
          <br />
          Telefon: {site.phone.display} · E-Mail: {site.email}
        </p>
      </LegalSection>

      <LegalSection heading="2. Allgemeines zur Datenverarbeitung">
        <p>
          Wir verarbeiten personenbezogene Daten unserer Nutzer grundsätzlich nur, soweit dies zur
          Bereitstellung einer funktionsfähigen Website sowie unserer Inhalte und Leistungen
          erforderlich ist. Rechtsgrundlagen sind insbesondere Art. 6 Abs. 1 lit. a, b und f DSGVO.
        </p>
      </LegalSection>

      <LegalSection heading="3. Hosting">
        <p>
          Diese Website wird bei <Placeholder>Hosting-Anbieter, z. B. Vercel Inc.</Placeholder> gehostet.
          Beim Aufruf der Website werden technisch notwendige Server-Logfiles (z. B. IP-Adresse,
          Datum/Uhrzeit, abgerufene Seite, Browsertyp) verarbeitet. Rechtsgrundlage ist unser
          berechtigtes Interesse an einem sicheren und stabilen Betrieb (Art. 6 Abs. 1 lit. f DSGVO).
          Ein Auftragsverarbeitungsvertrag mit dem Anbieter liegt vor.
        </p>
      </LegalSection>

      <LegalSection heading="4. Kontakt- und Anfrageformular">
        <p>
          Wenn Sie uns über das Anfrageformular oder per Telefon/E-Mail kontaktieren, verarbeiten wir
          die von Ihnen angegebenen Daten (z. B. Name, Telefonnummer, E-Mail, Angaben zum Objekt und
          Ihre Nachricht) ausschließlich zur Bearbeitung Ihrer Anfrage und für etwaige
          Anschlussfragen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen)
          bzw. lit. a DSGVO (Einwilligung). Die Übermittlung erfolgt verschlüsselt; der Versand an uns
          erfolgt über den Dienstleister <Placeholder>Resend (Resend, Inc.)</Placeholder>.
        </p>
      </LegalSection>

      <LegalSection heading="5. Kartendarstellung">
        <p>
          Zur Anzeige unseres Standorts binden wir eine Karte von{" "}
          <Placeholder>Google Maps (Google Ireland Ltd.)</Placeholder> ein. Beim Laden der Karte kann
          Ihre IP-Adresse an den Anbieter übermittelt werden. Bitte prüfen Sie, ob hierfür eine
          Einwilligung über ein Cookie-/Consent-Banner einzuholen ist.
        </p>
      </LegalSection>

      <LegalSection heading="6. Ihre Rechte">
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit sowie Widerspruch (Art. 15–21 DSGVO). Eine erteilte Einwilligung können
          Sie jederzeit mit Wirkung für die Zukunft widerrufen. Ihnen steht zudem ein Beschwerderecht
          bei einer Aufsichtsbehörde zu.
        </p>
      </LegalSection>

      <LegalSection heading="7. Speicherdauer">
        <p>
          Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke
          erforderlich ist oder gesetzliche Aufbewahrungsfristen dies vorsehen.
        </p>
      </LegalSection>

      <p className="text-sm text-steel-500">
        Stand: <Placeholder>Datum bei Veröffentlichung einsetzen</Placeholder>
      </p>
    </LegalShell>
  );
}
