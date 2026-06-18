import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { site } from "@/config/site";
import { JsonLd } from "@/components/seo/JsonLd";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} – Heizöltank Demontage, Reinigung & Wärmespeicher`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [
    "Heizöltank Demontage",
    "Heizöltank entsorgen",
    "Tankreinigung",
    "Erdtank stilllegen",
    "Wärmespeicher",
    "Haase Kellertank",
    "GFK Reparatur",
    "Fachbetrieb WHG",
    "Tanksysteme Sachsen",
    "Gornsdorf",
  ],
  authors: [{ name: site.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: site.url,
    siteName: site.name,
    title: `${site.name} – Fachbetrieb nach WHG`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#060912",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <JsonLd />
        <a
          href="#hauptinhalt"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-amber-500 focus:px-4 focus:py-2 focus:font-semibold focus:text-steel-950"
        >
          Zum Inhalt springen
        </a>
        {children}
      </body>
    </html>
  );
}
