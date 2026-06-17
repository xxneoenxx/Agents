import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import { cinema, fullAddress } from "@/lib/cinema";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(cinema.contact.website),
  title: {
    default: `${cinema.name} – ${cinema.tagline}`,
    template: `%s | ${cinema.name}`,
  },
  description:
    "Aktuelles Kinoprogramm, Tickets online buchen und Sitzplätze wählen im CineStar Chemnitz – Der Filmpalast am Roten Turm. 11 Säle, Dolby Atmos und Komfortsessel.",
  keywords: [
    "Kino Chemnitz",
    "CineStar Chemnitz",
    "Kinoprogramm Chemnitz",
    "Tickets buchen",
    "Roter Turm Kino",
    "Filmpalast",
  ],
  openGraph: {
    title: `${cinema.name} – ${cinema.tagline}`,
    description: "Aktuelles Kinoprogramm & Online-Tickets im Filmpalast am Roten Turm.",
    type: "website",
    locale: "de_DE",
    siteName: cinema.name,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070711",
  width: "device-width",
  initialScale: 1,
};

function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "MovieTheater",
    name: cinema.fullName,
    telephone: cinema.contact.phoneInternational,
    email: cinema.contact.email,
    url: cinema.contact.website,
    address: {
      "@type": "PostalAddress",
      streetAddress: cinema.address.street,
      postalCode: cinema.address.zip,
      addressLocality: cinema.address.city,
      addressRegion: cinema.address.region,
      addressCountry: "DE",
    },
    geo: { "@type": "GeoCoordinates", latitude: cinema.geo.lat, longitude: cinema.geo.lng },
    openingHours: "Mo-Su 13:30-23:00",
    description: `Multiplex-Kino mit ${cinema.halls} Sälen in ${fullAddress}.`,
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
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-ink"
        >
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
