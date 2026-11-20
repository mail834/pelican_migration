"use client";
import { useEffect, useRef, useState } from "react";
import { TURNSTILE_SITE_KEY, loadTurnstile, registerBox } from "./turnstile";

/** Visible Cloudflare Turnstile check. Place it inside the form, above the submit button. Renders nothing when not configured. */
export default function TurnstileBox({ theme = "light", className = "" }: { theme?: "light" | "dark"; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!TURNSTILE_SITE_KEY || !element) return;
    let cleanup: (() => void) | undefined;
    let active = true;
    loadTurnstile()
      .then((turnstile) => { if (active) cleanup = registerBox(element, turnstile, { theme }); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; cleanup?.(); };
  }, [theme]);
  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <div className={className}>
      {/* Reserves the widget's height (65px) so the form doesn't jump when it loads. */}
      <div ref={container} data-turnstile className="min-h-[4.0625rem] w-full" />
      {failed && <p role="alert" className="t-body4 mt-1 text-dark-300">Security check could not load. Please disable content blockers for this site or call +971 4 564 6282.</p>}
    </div>
  );
}
