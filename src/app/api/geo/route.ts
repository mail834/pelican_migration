/** Visitor's ISO country code from the host's IP geolocation header (Vercel, or Cloudflare when proxied). */
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const country = (request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? "").toUpperCase();
  return Response.json({ country: /^[A-Z]{2}$/.test(country) ? country : null }, { headers: { "Cache-Control": "private, no-store" } });
}
