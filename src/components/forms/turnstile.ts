"use client";

/**
 * Cloudflare Turnstile, loaded only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set and only when a form is submitted.
 * The widget stays invisible unless Cloudflare needs the visitor to interact. Each token is single-use, so a
 * fresh widget is rendered for every submission and removed afterwards.
 */

type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoad: Promise<Turnstile> | undefined;

function loadScript() {
  scriptLoad ??= new Promise<Turnstile>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile unavailable")));
    script.onerror = () => { scriptLoad = undefined; reject(new Error("Turnstile unavailable")); };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

/** Resolves to a token, or undefined when Turnstile is not configured. Rejects if verification cannot complete. */
export async function getTurnstileToken(): Promise<string | undefined> {
  if (!SITE_KEY) return undefined;
  const turnstile = await loadScript().catch(() => { throw new Error("Security check could not load. Please disable content blockers for this site or call +971 4 564 6282."); });
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:2147483647";
  document.body.appendChild(container);
  let widgetId = "";
  try {
    return await new Promise<string>((resolve, reject) => {
      widgetId = turnstile.render(container, {
        sitekey: SITE_KEY,
        execution: "execute",
        appearance: "interaction-only",
        callback: (token: string) => resolve(token),
        "error-callback": () => reject(new Error("Security check failed. Please reload the page and try again.")),
        "timeout-callback": () => reject(new Error("Security check timed out. Please try again.")),
      });
      turnstile.execute(widgetId);
    });
  } finally {
    if (widgetId) turnstile.remove(widgetId);
    container.remove();
  }
}
