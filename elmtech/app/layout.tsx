import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { company, fullAddress } from "@/lib/elmtech";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(company.contact.website),
  title: {
    default: `${company.name} – ${company.tagline}`,
    template: `%s | ${company.short}`,
  },
  description:
    "Elmtech Verbundelemente GmbH: maßgefertigte Dämm- und Fassadenelemente für Schallschutz, Einbruchschutz, Energieeffizienz und Brandschutz. Familienunternehmen seit 1993.",
  keywords: [
    "Verbundelemente",
    "Sandwichelemente",
    "Schallschutz Element",
    "Fassadenelemente",
    "Dämmelemente",
    "Brandschutz Element",
    "Einbruchschutz",
    "Elmtech",
    "Frankenberg Sachsen",
  ],
  openGraph: {
    title: `${company.name} – ${company.tagline}`,
    description: company.claim,
    type: "website",
    locale: "de_DE",
    siteName: company.name,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
};

function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Manufacturer",
    name: company.name,
    description: company.intro,
    foundingDate: "1993",
    telephone: company.contact.phoneInternational,
    faxNumber: "+49 37206 578711",
    email: company.contact.email,
    url: company.contact.website,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.address.street,
      postalCode: company.address.zip,
      addressLocality: `${company.address.city} / ${company.address.district}`,
      addressRegion: company.address.region,
      addressCountry: "DE",
    },
    geo: { "@type": "GeoCoordinates", latitude: company.geo.lat, longitude: company.geo.lng },
    areaServed: "DE",
    knowsAbout: ["Schallschutz", "Einbruchschutz", "Energieeffizienz", "Brandschutz", "Verbundelemente"],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${sans.variable} ${display.variable}`}>
      <head>
        <StructuredData />
      </head>
      <body>
        <a
          href="#hauptinhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
