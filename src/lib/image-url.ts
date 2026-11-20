import assets from "@/content/image-assets.json";

const images = assets as Record<string, { url: string }>;

/**
 * Default quality by delivered width. Widths above 640px are requested almost only by 2–3× screens, where
 * stronger compression is invisible but cuts bytes ~40% vs q=85. This is the main lever on Sanity CDN bandwidth.
 */
function defaultQuality(width?: number) {
  return width && width > 640 ? 65 : 75;
}

/** Resolve legacy local paths to the compressed assets hosted by Sanity, with responsive width and quality. */
export function imageUrl(src: string, width?: number, quality?: number): string {
  const resolved = images[src]?.url ?? src;
  if (!resolved.startsWith("https://cdn.sanity.io/images/")) return resolved;
  const url = new URL(resolved);
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "max");
  url.searchParams.set("q", String(quality ?? defaultQuality(width)));
  if (width) url.searchParams.set("w", String(width));
  return url.toString();
}
