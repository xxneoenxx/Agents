import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/impressum", "/datenschutz"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
