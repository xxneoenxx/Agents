import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { restaurant, fullAddress, openingHours, formatRange } from "@/lib/restaurant";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(restaurant.contact.website),
  title: {
    default: `${restaurant.name} – ${restaurant.tagline}`,
    template: `%s | ${restaurant.name}`,
  },
  description: restaurant.description,
  keywords: [
    "Restaurant Limbach-Oberfrohna",
    "Bauernhof zum Silberbergwerk",
    "regionale Küche Sachsen",
    "Tisch reservieren",
    "Pension Limbach-Oberfrohna",
    "Biergarten",
    "Bowlingstollen",
  ],
  openGraph: {
    title: `${restaurant.name} – ${restaurant.tagline}`,
    description: restaurant.description,
    type: "website",
    locale: "de_DE",
    siteName: restaurant.name,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#3d2b1f",
  width: "device-width",
  initialScale: 1,
};

// Strukturierte Daten für Google (Rich Results / lokale Suche)
function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: restaurant.description,
    servesCuisine: "Deutsch, Regional, Gut bürgerlich",
    priceRange: "€€",
    telephone: restaurant.contact.phoneInternational,
    email: restaurant.contact.email,
    url: restaurant.contact.website,
    address: {
      "@type": "PostalAddress",
      streetAddress: restaurant.address.street,
      postalCode: restaurant.address.zip,
      addressLocality: restaurant.address.city,
      addressRegion: restaurant.address.region,
      addressCountry: "DE",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: restaurant.geo.lat,
      longitude: restaurant.geo.lng,
    },
    openingHoursSpecification: openingHours
      .filter((d) => d.ranges.length > 0)
      .flatMap((d) =>
        d.ranges.map((r) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: `https://schema.org/${
            ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.day]
          }`,
          opens: formatRange(r).split("–")[0],
          closes: formatRange(r).split("–")[1],
        })),
      ),
    acceptsReservations: "True",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${sans.variable} ${serif.variable}`}>
      <head>
        <StructuredData />
      </head>
      <body>
        <a
          href="#hauptinhalt"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-bark focus:px-4 focus:py-2 focus:text-cream"
        >
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
