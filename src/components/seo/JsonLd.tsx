import { site } from "@/config/site";
import { services } from "@/config/services";

/**
 * Strukturierte Daten (schema.org) für lokale Auffindbarkeit.
 * LocalBusiness + angebotene Leistungen.
 */
export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${site.url}/#business`,
    name: site.name,
    description: site.description,
    url: site.url,
    telephone: site.phone.display,
    image: `${site.url}/logo.svg`,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      postalCode: site.address.zip,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    areaServed: { "@type": "State", name: "Sachsen" },
    knowsAbout: services.map((s) => s.title),
    makesOffer: services.map((s) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: s.title, description: s.short },
    })),
    sameAs: [site.social.facebook, site.social.website].filter(Boolean),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
