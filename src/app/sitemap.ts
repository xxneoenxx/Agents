import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${site.url}/impressum`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${site.url}/datenschutz`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
