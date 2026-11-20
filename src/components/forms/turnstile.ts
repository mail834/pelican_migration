"use client";

/**
 * Cloudflare Turnstile, active only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set.
 * Each form shows a visible check (<TurnstileBox />) above its submit button. On submit, the form reads the
 * token from the box inside it. Tokens are single-use, so the box is reset after every attempt.
 */

type RenderOptions = Record<string, unknown>;
type Turnstile = {
  render: (container: HTMLElement, options: RenderOptions) => string;
  getResponse: (widgetId: string) => string | undefined;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const LOAD_ERROR = "Security check could not load. Please disable content blockers for this site or call +971 4 564 6282.";
let scriptLoad: Promise<Turnstile> | undefined;

export function loadTurnstile() {
  scriptLoad ??= new Promise<Turnstile>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error(LOAD_ERROR)));
    script.onerror = () => { scriptLoad = undefined; reject(new Error(LOAD_ERROR)); };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

/** State of one visible box, keyed by its container element. */
type Box = { widgetId: string; token: string; waiters: ((token: string) => void)[]; error: string };
const boxes = new WeakMap<HTMLElement, Box>();

export function registerBox(container: HTMLElement, turnstile: Turnstile, options: RenderOptions) {
  const box: Box = { widgetId: "", token: "", waiters: [], error: "" };
  boxes.set(container, box);
  box.widgetId = turnstile.render(container, {
    ...options,
    sitekey: TURNSTILE_SITE_KEY,
    appearance: "always",
    size: "flexible",
    "refresh-expired": "auto",
    callback: (token: string) => { box.token = token; box.error = ""; box.waiters.splice(0).forEach((resolve) => resolve(token)); },
    "expired-callback": () => { box.token = ""; },
    "error-callback": () => { box.token = ""; box.error = "Security check failed. Please reload the page and try again."; },
  });
  return () => { boxes.delete(container); turnstile.remove(box.widgetId); };
}

/**
 * Token from the visible box inside `scope` (the form). Resolves to undefined when Turnstile isn't configured.
 * Waits briefly if the check is still running; asks the visitor to complete it if it needs a click.
 */
export async function getTurnstileToken(scope: HTMLElement | null): Promise<string | undefined> {
  if (!TURNSTILE_SITE_KEY) return undefined;
  const container = scope?.querySelector<HTMLElement>("[data-turnstile]");
  const box = container && boxes.get(container);
  if (!box) throw new Error(LOAD_ERROR);
  if (box.error) throw new Error(box.error);
  const token = box.token || window.turnstile?.getResponse(box.widgetId) || await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Please complete the security check above the button, then submit again.")), 8000);
    box.waiters.push((value) => { clearTimeout(timer); resolve(value); });
  });
  // Single-use: clear it now so a retry gets a fresh token.
  box.token = "";
  window.turnstile?.reset(box.widgetId);
  return token;
}
