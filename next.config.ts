import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Vercel's comment/feedback toolbar is injected on preview deployments only.
const vercelLive = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";
// Optional Cloudflare edge cache for Sanity images (cloudflare/image-cache). Must match src/lib/image-url.ts.
const imageCdn = /^https:\/\/[a-z0-9.-]+$/.test(process.env.NEXT_PUBLIC_IMAGE_CDN ?? "") ? ` ${process.env.NEXT_PUBLIC_IMAGE_CDN}` : "";

/**
 * Content-Security-Policy for the public site. Every external origin here is one the browser actually loads:
 * - cdn.sanity.io: CMS images, uploaded videos, posters and caption tracks
 * - NEXT_PUBLIC_IMAGE_CDN (if set): the Cloudflare image cache in front of cdn.sanity.io
 * - www.youtube-nocookie.com: testimonial/guide video embeds
 * - challenges.cloudflare.com: Turnstile bot check on form submit (docs/INTEGRATIONS.md)
 * script-src keeps 'unsafe-inline' because Next's hydration scripts are inline; nonces would force every
 * page to render dynamically and lose static/ISR caching. External script hosts are still blocked.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com${vercelLive}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://cdn.sanity.io${imageCdn}`,
  "media-src 'self' https://cdn.sanity.io",
  "font-src 'self' data:",
  `connect-src 'self' https://challenges.cloudflare.com${vercelLive}${isDev ? " ws:" : ""}`,
  `frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com${vercelLive}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  // No includeSubDomains/preload: other pelicanmigration.com subdomains must be confirmed HTTPS-only first.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Restrict powerful features the site never uses; fullscreen/autoplay stay default for video embeds.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
];

/** Sanity-hosted Studio (separate origin). Only an https://*.sanity.studio URL is accepted, so /studio can never redirect elsewhere. */
const studioUrl = /^https:\/\/[a-z0-9-]+\.sanity\.studio\/?$/.test(process.env.SANITY_STUDIO_URL ?? "") ? process.env.SANITY_STUDIO_URL!.replace(/\/$/, "") : null;

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",
  poweredByHeader: false,
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io", pathname: "/images/**" }],
    // Next's default ladder goes to 3840px, which Retina desktops fetch for full-width images. 1920 is the cap:
    // full-width photos stay sharp, and Sanity CDN bandwidth stays bounded (see docs/SANITY.md, "Bandwidth budget").
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [{ source: "/:path*", headers: [...securityHeaders, { key: "Content-Security-Policy", value: csp }] }];
  },
  async redirects() {
    return [
      // Keep links to the old WordPress gallery URL working.
      { source: "/visa-approval-gallery", destination: "/visa-gallery", permanent: true },
      // Old editor bookmarks. Temporary, so the Studio hostname can change later without stale browser caches.
      ...(studioUrl ? [{ source: "/studio/:path*", destination: `${studioUrl}/:path*`, permanent: false }] : []),
    ];
  },
};

export default nextConfig;
