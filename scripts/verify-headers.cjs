/* eslint-disable @typescript-eslint/no-require-imports -- Compile next.config.ts to verify security headers without a build. */
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

function loadConfig(env) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  try {
    const filename = path.resolve("next.config.ts");
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const mod = { exports: {} };
    new Function("module", "exports", "require", source)(mod, mod.exports, require);
    return mod.exports.default;
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
}

/** Headers Next would send for a path: later matching rules override earlier ones with the same key. */
function headersFor(rules, pathname) {
  const result = {};
  for (const rule of rules) {
    const pattern = rule.source === "/:path*" ? /^\/.*$/ : rule.source === "/studio/:path*" ? /^\/studio(?:\/.*)?$/ : new RegExp(`^${rule.source}$`);
    if (pattern.test(pathname)) for (const { key, value } of rule.headers) result[key.toLowerCase()] = value;
  }
  return result;
}

(async () => {
  const config = loadConfig({ NODE_ENV: "production" });
  assert.equal(config.poweredByHeader, false, "X-Powered-By must be disabled");
  const rules = await config.headers();

  for (const pathname of ["/", "/check-eligibility", "/blogs/some-post", "/api/enquiries", "/studio"]) {
    const h = headersFor(rules, pathname);
    const csp = h["content-security-policy"] ?? "";
    assert.match(csp, /frame-ancestors 'none'/, `${pathname}: clickjacking protection`);
    assert.match(csp, /object-src 'none'/, `${pathname}: no plugins`);
    assert.match(csp, /base-uri 'self'/, `${pathname}: base-uri`);
    assert.match(csp, /form-action 'self'/, `${pathname}: form-action`);
    assert.doesNotMatch(csp, /unsafe-eval/, `${pathname}: no unsafe-eval in production`);
    assert.doesNotMatch(csp, /(?:^|\s)\*(?:\s|;|$)/, `${pathname}: no wildcard sources`);
    assert.match(csp, /script-src[^;]*https:\/\/challenges\.cloudflare\.com/, `${pathname}: Turnstile script allowed`);
    assert.match(csp, /frame-src[^;]*https:\/\/www\.youtube-nocookie\.com/, `${pathname}: YouTube embeds allowed`);
    assert.match(csp, /img-src[^;]*https:\/\/cdn\.sanity\.io/, `${pathname}: Sanity images allowed`);
    assert.equal(h["x-content-type-options"], "nosniff");
    assert.equal(h["x-frame-options"], "DENY");
    assert.match(h["strict-transport-security"] ?? "", /max-age=\d{7,}/);
    assert.equal(h["referrer-policy"], "strict-origin-when-cross-origin");
    assert.match(h["permissions-policy"] ?? "", /camera=\(\)/);
  }

  // Studio is hosted by Sanity on its own origin; /studio only redirects there, and only to *.sanity.studio.
  assert.equal(config.outputFileTracingIncludes, undefined, "no Studio build bundled into the website");
  const studioRedirect = async (url) => (await loadConfig({ NODE_ENV: "production", SANITY_STUDIO_URL: url }).redirects()).find((r) => r.source.startsWith("/studio"));
  assert.equal(await studioRedirect(undefined), undefined, "no redirect until a Studio URL is configured");
  assert.deepEqual(await studioRedirect("https://pelican-immigration.sanity.studio/"), { source: "/studio/:path*", destination: "https://pelican-immigration.sanity.studio/:path*", permanent: false });
  for (const bad of ["https://evil.example", "http://pelican.sanity.studio", "https://pelican.sanity.studio.evil.example", "https://x.sanity.studio/../evil"]) assert.equal(await studioRedirect(bad), undefined, `rejects ${bad}`);

  const dev = await loadConfig({ NODE_ENV: "development" }).headers();
  assert.match(headersFor(dev, "/")["content-security-policy"], /'unsafe-eval'/, "dev keeps React refresh working");
  const preview = await loadConfig({ NODE_ENV: "production", VERCEL_ENV: "preview" }).headers();
  assert.match(headersFor(preview, "/")["content-security-policy"], /vercel\.live/, "preview allows the Vercel toolbar");
  assert.doesNotMatch(headersFor(rules, "/")["content-security-policy"], /vercel\.live/, "production does not");

  console.log("Security headers: CSP, HSTS, nosniff, framing, referrer and permissions policies passed for site, API and Studio routes.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
