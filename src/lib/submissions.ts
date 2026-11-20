/** Server-side validation and delivery. Never import this module into client UI. */
import { renderAcknowledgementEmail, renderLeadEmail } from "./enquiry-email";
const EMAIL = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
const MAX_BODY = 65536;
const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 15 * 60;
const requests = new Map<string, { count: number; until: number }>();
const json = (error: string, status: number) => Response.json({ error }, { status });

/**
 * Client IP as set by the hosting platform. Vercel sets x-real-ip and overwrites x-forwarded-for;
 * behind any other proxy, that proxy must overwrite both (see docs/INTEGRATIONS.md).
 */
function clientIp(request: Request) {
  return request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

/** IPs are hashed before they are used as keys, so the limiter never stores raw addresses. */
async function rateKey(ip: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`pelican-forms:${ip}`));
  return `rl:form:${Buffer.from(digest).toString("base64url").slice(0, 32)}`;
}

/** Per-instance fallback. Resets on cold starts, so it is only a second layer behind the shared limit. */
function localCount(key: string) {
  const now = Date.now();
  for (const [stored, value] of requests) if (value.until < now) requests.delete(stored);
  const entry = requests.get(key) ?? { count: 0, until: now + RATE_WINDOW_SECONDS * 1000 };
  entry.count += 1;
  requests.set(key, entry);
  return entry.count;
}

/** Shared count across all serverless instances via Upstash Redis REST. Returns null when unavailable. */
async function sharedCount(key: string, transport: typeof fetch) {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const response = await transport(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(RATE_WINDOW_SECONDS), "NX"]]),
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const [incr] = (await response.json()) as { result?: unknown }[];
    if (typeof incr?.result !== "number") throw new Error("unexpected reply");
    return incr.result;
  } catch (problem) {
    console.warn(JSON.stringify({ event: "rate_limit_store_unavailable", reason: problem instanceof Error ? problem.message : "unknown" }));
    return null;
  }
}

/**
 * Cloudflare Turnstile check, enforced only when TURNSTILE_SECRET_KEY is set.
 * A rejected token blocks the request; an unreachable Cloudflare does not, so real leads are not lost.
 */
async function verifyHuman(token: unknown, ip: string, transport: typeof fetch) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const response = await transport("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, ...(ip !== "unknown" ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return (await response.json() as { success?: unknown }).success === true;
  } catch (problem) {
    console.warn(JSON.stringify({ event: "turnstile_unavailable", reason: problem instanceof Error ? problem.message : "unknown" }));
    return true;
  }
}

export async function parseSubmission(request: Request, transport: typeof fetch = fetch): Promise<Record<string, unknown> | Response> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin && origin !== process.env.SITE_ORIGIN) return json("Please submit this form from our website.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json("Unsupported request format.", 415);
  if (Number(request.headers.get("content-length")) > MAX_BODY) return json("This submission is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) return json("Please complete the form.", 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BODY) { await reader.cancel(); return json("This submission is too large.", 413); }
    chunks.push(value);
  }
  let data: Record<string, unknown>;
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) return json("Please complete the form.", 400);
    data = body as Record<string, unknown>;
  } catch { return json("Please check your form and try again.", 400); }
  if (data.website) return json("Unable to accept this submission.", 400);

  const ip = clientIp(request);
  const key = await rateKey(ip);
  const count = (await sharedCount(key, transport)) ?? localCount(key);
  if (count > RATE_LIMIT) return json("Too many requests. Please try again in 15 minutes.", 429);

  const { turnstileToken, ...fields } = data;
  if (!await verifyHuman(turnstileToken, ip, transport)) return json("We could not verify this submission. Please reload the page and try again.", 400);
  return fields;
}

export type EnquiryMessage = { from: string; to: string; replyTo: string; subject: string; text: string; html: string };
export type SendMail = (message: EnquiryMessage) => Promise<{ messageId?: string; rejected?: unknown[] }>;

const SMTP_TIMEOUT = 10_000;
const DEDUPE_SECONDS = 24 * 60 * 60;

/** SMTP settings from the environment, or null when incomplete. Port 465 uses TLS from the start; 587 upgrades with STARTTLS. */
function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, ""); // Google shows App Passwords in groups of four.
  if (!host || !user || !pass || !Number.isInteger(port) || port <= 0) return null;
  return { host, port, user, pass };
}

/** Sends one message over SMTP. A new connection per message suits serverless functions. */
const smtpSend: SendMail = async (message) => {
  const config = smtpConfig();
  if (!config) throw new Error("SMTP is not configured");
  const { createTransport } = await import("nodemailer");
  const mailer = createTransport({
    host: config.host, port: config.port, secure: config.port === 465, requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: SMTP_TIMEOUT, greetingTimeout: SMTP_TIMEOUT, socketTimeout: SMTP_TIMEOUT,
  });
  try { return await mailer.sendMail(message); } finally { mailer.close(); }
};

/**
 * Claims a submission ID in Redis so a double-click or retry sends one email, not two (SMTP has no idempotency key).
 * Returns "new", "duplicate", or "unavailable" when Redis is not configured or unreachable.
 */
async function claimSubmission(id: string, transport: typeof fetch, release = false): Promise<"new" | "duplicate" | "unavailable"> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return "unavailable";
  const key = `enquiry:sent:${id}`;
  try {
    const response = await transport(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([release ? ["DEL", key] : ["SET", key, "1", "NX", "EX", String(DEDUPE_SECONDS)]]),
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    const [reply] = (await response.json()) as { result?: unknown }[];
    return release || reply?.result === "OK" ? "new" : "duplicate";
  } catch (problem) {
    console.warn(JSON.stringify({ event: "dedupe_store_unavailable", reason: problem instanceof Error ? problem.message : "unknown" }));
    return "unavailable";
  }
}

/** Structured failure log for alerting. Never include names, emails or field values. */
function logDeliveryFailure(stage: string, problem: unknown, kind: unknown) {
  const error = problem as { code?: unknown; responseCode?: unknown; command?: unknown; message?: unknown } | null;
  console.error(JSON.stringify({
    event: "enquiry_delivery_failed", provider: "smtp", stage, form: kind === "eligibility" ? "eligibility" : "enquiry",
    code: typeof error?.code === "string" ? error.code : undefined,
    responseCode: typeof error?.responseCode === "number" ? error.responseCode : undefined,
    command: typeof error?.command === "string" ? error.command : undefined,
  }));
}

/** Runs work after the response is sent (the route passes Next's `after`). Defaults to running it inline. */
export type Schedule = (task: () => Promise<void>) => void | Promise<void>;

/** Acknowledgement to the visitor. On by default; set ENQUIRY_ACKNOWLEDGEMENT=off to disable. Failures are logged, never shown. */
async function acknowledge(send: SendMail, from: string, replyTo: string, visitor: string, kind: unknown, name: string) {
  if (process.env.ENQUIRY_ACKNOWLEDGEMENT?.trim().toLowerCase() === "off") return;
  try {
    const result = await send({ from, to: visitor, replyTo, ...renderAcknowledgementEmail({ kind, name }) });
    if (!result.messageId || result.rejected?.length) throw Object.assign(new Error("recipient rejected"), { code: "EREJECTED" });
  } catch (problem) {
    logDeliveryFailure("acknowledgement", problem, kind);
  }
}

export async function deliverEnquiry(data: Record<string, unknown>, send: SendMail = smtpSend, transport: typeof fetch = fetch, schedule: Schedule = (task) => task()) {
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!EMAIL.test(email) || email.length > 254 || !name || name.length > 160) return json("Please enter your name and a valid email address.", 400);
  if (!Array.isArray(data.fields) || !data.fields.length || data.fields.length > 350) return json("Please check the form details.", 400);
  const fields: { label: string; value: string }[] = [];
  for (const field of data.fields) {
    if (!field || typeof field.label !== "string" || typeof field.value !== "string" || field.label.length > 300 || field.value.length > 5000) return json("Please check the form details.", 400);
    fields.push({ label: field.label, value: field.value });
  }
  const from = process.env.ENQUIRY_FROM_EMAIL?.trim();
  const to = process.env.ENQUIRY_TO_EMAIL?.trim();
  if ((send === smtpSend && !smtpConfig()) || !from || !to) return json("Online enquiries are not available yet. Please call +971 4 564 6282 or email support@pelicanmigration.com.", 503);
  const id = typeof data.submissionId === "string" && /^[\w-]{16,80}$/.test(data.submissionId) ? data.submissionId : crypto.randomUUID();
  if (await claimSubmission(id, transport) === "duplicate") return Response.json({ ok: true });
  const message: EnquiryMessage = {
    from, to, replyTo: email,
    ...renderLeadEmail({ kind: data.kind, name, email, page: typeof data.page === "string" ? data.page.slice(0, 500) : "/", fields, id }),
  };
  try {
    const accepted = await send(message);
    if (!accepted.messageId || accepted.rejected?.length) throw Object.assign(new Error("recipient rejected"), { code: "EREJECTED" });
    await schedule(() => acknowledge(send, from, to, email, data.kind, name));
    return Response.json({ ok: true });
  } catch (problem) {
    logDeliveryFailure("send", problem, data.kind);
    await claimSubmission(id, transport, true); // Let the visitor's retry go through.
    return json("We could not deliver your enquiry. Please try again or contact our team directly.", 502);
  }
}

export async function deliverNewsletter(data: Record<string, unknown>, transport: typeof fetch = fetch) {
  const email = typeof data.email === "string" ? data.email.trim() : "";
  if (!EMAIL.test(email) || email.length > 254 || data.consent !== true) return json("Please enter a valid email address and agree to receive the newsletter.", 400);
  const endpoint = process.env.NEWSLETTER_WEBHOOK_URL;
  if (!endpoint) return json("Online subscriptions are not available yet. Please contact support@pelicanmigration.com.", 503);
  try {
    if (new URL(endpoint).protocol !== "https:") return json("Subscriptions are temporarily unavailable.", 503);
    const response = await transport(endpoint, { method: "POST", redirect: "error", headers: { "Content-Type": "application/json", ...(process.env.NEWSLETTER_WEBHOOK_SECRET ? { Authorization: `Bearer ${process.env.NEWSLETTER_WEBHOOK_SECRET}` } : {}) }, body: JSON.stringify({ email, consent: true, consentText: "I agree to receive the Pelican newsletter by email.", source: "pelican-website", requestedAt: new Date().toISOString() }), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return json("We could not process your subscription. Please try again.", 502);
    return Response.json({ ok: true });
  } catch { return json("Unable to connect. Please try again later.", 502); }
}
