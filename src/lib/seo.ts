import type { Metadata } from "next";

export const SITE_NAME = "Pelican Migration Consultants";
export const SITE_URL = (process.env.SITE_ORIGIN || "https://www.pelicanmigration.ae").replace(/\/$/, "");

/**
 * Link-preview image for every page (WhatsApp, Facebook, LinkedIn, X): the Pelican logo on white, 1200×630 PNG.
 * Social platforms don't render SVG, so this is a raster copy of the logo SVGs in public/icons.
 */
const SHARE_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME };

/** Title, description and the Open Graph / Twitter tags that make a shared link show a title, summary and image. */
export function pageMetadata({ title, description, path, type = "website" }: {
  title: string;
  description?: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  return {
    title,
    description,
    openGraph: { title, description, url: path, siteName: SITE_NAME, type, locale: "en_US", images: [SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
  };
}
