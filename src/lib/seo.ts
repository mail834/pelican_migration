import type { Metadata } from "next";
import assets from "@/content/image-assets.json";

const images = assets as Record<string, { url: string }>;

export const SITE_NAME = "Pelican Migration Consultants";
export const SITE_URL = (process.env.SITE_ORIGIN || "https://www.pelicanmigration.ae").replace(/\/$/, "");
/** Home hero (passport artwork): the preview for pages without a hero photo of their own. */
export const DEFAULT_SHARE_IMAGE = "/images/hero-bg.png";

/**
 * Link-preview image (WhatsApp, Facebook, LinkedIn, X): the page's hero cropped to 1200×630 as a JPEG by Sanity.
 * Always cdn.sanity.io, not the optional image cache, so preview URLs stay stable once platforms have cached them.
 * JPEG at q=80 keeps it well under WhatsApp's ~300KB preview limit.
 */
export function shareImage(src: string) {
  const resolved = images[src]?.url ?? src;
  if (!resolved.startsWith("https://cdn.sanity.io/images/")) return resolved;
  const url = new URL(resolved);
  url.search = "";
  for (const [key, value] of Object.entries({ w: "1200", h: "630", fit: "crop", fm: "jpg", q: "80" })) url.searchParams.set(key, value);
  return url.toString();
}

/** Title, description and the Open Graph / Twitter tags that make a shared link show a title, summary and image. */
export function pageMetadata({ title, description, image = DEFAULT_SHARE_IMAGE, path, type = "website" }: {
  title: string;
  description?: string;
  image?: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  // Social platforms don't render SVG previews (e.g. the world-map pattern some citizenship heroes use).
  const images = [{ url: shareImage(image.endsWith(".svg") ? DEFAULT_SHARE_IMAGE : image), width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    openGraph: { title, description, url: path, siteName: SITE_NAME, type, locale: "en_US", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
