import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { company } from "@/content/site";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const description =
  "Niemeier Fahrzeugwerke GmbH in Lunzenau: ultraleichte Aluminium-Tankfahrzeuge, maßgefertigte Aufbauten, Metallbau und Nutzfahrzeug-Service — Bremsenservice, Tankprüfungen, Wartung & Reparatur aus einer Hand.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.niemeier-fahrzeugwerke.eu"),
  title: {
    default: `${company.legalName} | ${company.tagline}`,
    template: `%s | ${company.name}`,
  },
  description,
  keywords: [
    "Tankfahrzeuge",
    "Aluminiumtank",
    "Tankaufbau",
    "Metallbau",
    "Tankprüfung",
    "Bremsenservice",
    "Nutzfahrzeug Service",
    "Lunzenau",
    "Sachsen",
  ],
  authors: [{ name: company.legalName }],
  openGraph: {
    type: "website",
    locale: "de_DE",
    title: `${company.legalName} | ${company.tagline}`,
    description,
    siteName: company.name,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#14181c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <a
          href="#leistungen"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-adr focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-graphit"
        >
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
