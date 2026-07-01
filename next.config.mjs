// Statischer Export (GitHub-Pages-Vorschau) wird über STATIC_EXPORT gesteuert,
// damit der normale Dev-/Vercel-Build unverändert bleibt.
const isStatic = process.env.STATIC_EXPORT === "1";
// Basis-Pfad für die GitHub-Pages-Vorschau: https://<user>.github.io/Agents/krebs/
const staticBasePath = process.env.STATIC_BASE_PATH || "/Agents/krebs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Eigene, vertrauenswürdige SVG-Grafiken (Logo, Demo-Projektbilder) zulassen.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Statischer Export kann den Next-Image-Optimizer nicht nutzen.
    unoptimized: isStatic,
  },
  transpilePackages: ["three"],
  ...(isStatic
    ? {
        output: "export",
        basePath: staticBasePath,
        assetPrefix: staticBasePath,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
