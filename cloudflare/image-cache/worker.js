/**
 * Edge cache for Sanity images, served at https://img.pelicanmigration.ae.
 *
 * The website requests  https://img.pelicanmigration.ae/images/th8gmrhr/production/<asset>?w=…&q=…&auto=format
 * and this Worker answers from Cloudflare's cache, fetching from cdn.sanity.io only on a miss.
 * Sanity asset URLs are content-addressed (a new upload gets a new URL), so cached copies never go stale.
 *
 * `auto=format` makes Sanity pick AVIF/WebP/original from the browser's Accept header, so the cache key
 * includes the chosen format. Only Sanity's image parameters are forwarded; anything else is dropped, so
 * random query strings can't create unlimited cache entries.
 */

const PROJECT_PATH = /^\/images\/th8gmrhr\/production\/[a-f0-9]{40}-\d+x\d+\.(?:jpg|jpeg|png|webp|gif|avif|svg)$/;
const ALLOWED_PARAMS = ["auto", "fm", "q", "w", "h", "fit", "crop", "rect", "dpr", "bg", "blur", "sharp"];
const YEAR = 31536000;

function formatFor(accept) {
  if (accept.includes("image/avif")) return "avif";
  if (accept.includes("image/webp")) return "webp";
  return "original";
}

const ACCEPT_FOR = { avif: "image/avif,image/webp,image/*;q=0.8", webp: "image/webp,image/*;q=0.8", original: "image/*" };

const worker = {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405, headers: { allow: "GET, HEAD" } });

    const url = new URL(request.url);
    if (!PROJECT_PATH.test(url.pathname)) return new Response("Not found", { status: 404, headers: { "cache-control": "public, max-age=3600" } });

    const params = new URLSearchParams();
    for (const name of ALLOWED_PARAMS) {
      const value = url.searchParams.get(name);
      if (value !== null && value.length <= 64) params.set(name, value);
    }
    params.sort();

    const negotiated = params.get("auto") === "format" && !params.has("fm");
    const format = negotiated ? formatFor(request.headers.get("accept") ?? "") : "fixed";
    const query = params.toString();
    const cacheKey = new Request(`${url.origin}${url.pathname}?${query}${query ? "&" : ""}__fmt=${format}`, { method: "GET" });
    const cache = caches.default;

    let response = await cache.match(cacheKey);
    if (!response) {
      const upstream = await fetch(`https://cdn.sanity.io${url.pathname}${query ? `?${query}` : ""}`, {
        headers: { accept: negotiated ? ACCEPT_FOR[format] : "image/*" },
      });
      if (!upstream.ok) {
        // Don't cache errors for long; a missing asset may be re-published.
        return new Response(upstream.status === 404 ? "Not found" : "Upstream error", { status: upstream.status === 404 ? 404 : 502, headers: { "cache-control": "public, max-age=60" } });
      }
      response = new Response(upstream.body, { status: 200, headers: upstream.headers });
      response.headers.set("cache-control", `public, max-age=${YEAR}, immutable`);
      response.headers.set("vary", "Accept");
      response.headers.set("access-control-allow-origin", "*");
      response.headers.set("x-content-type-options", "nosniff");
      // SVGs can carry scripts; this sandboxes them if someone opens one directly.
      response.headers.set("content-security-policy", "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox");
      for (const header of ["set-cookie", "x-sanity-shard", "via", "x-served-by", "x-cache", "x-cache-hits", "x-timer"]) response.headers.delete(header);
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      response.headers.set("x-edge-cache", "MISS");
    } else {
      response = new Response(response.body, response);
      response.headers.set("x-edge-cache", "HIT");
    }

    return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
  },
};

export default worker;
