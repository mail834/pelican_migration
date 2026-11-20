/* eslint-disable @typescript-eslint/no-require-imports -- Compile the server module for isolated delivery tests without sending network requests. */
const assert = require('node:assert/strict');
const fs = require('fs');
const ts = require('typescript');
const Module = require('module');
const path = require('path');
const filename = path.resolve('src/lib/submissions.ts');
const compiled = new Module(filename, module);
compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { deliverEnquiry, deliverNewsletter, parseSubmission } = compiled.exports;
const saved = { ...process.env };
const enquiry = { name: 'Test Applicant', email: 'test@example.com', submissionId: 'unit-test-submission-123', kind: 'eligibility', fields: [{ label: 'Destination', value: 'Canada' }] };
(async () => {
  for (const key of ['RESEND_API_KEY', 'ENQUIRY_FROM_EMAIL', 'ENQUIRY_TO_EMAIL', 'NEWSLETTER_WEBHOOK_URL', 'NEWSLETTER_WEBHOOK_SECRET']) delete process.env[key];
  assert.equal((await deliverEnquiry(enquiry)).status, 503);
  assert.equal((await deliverNewsletter({ email: 'test@example.com', consent: true })).status, 503);
  assert.equal((await deliverEnquiry({ ...enquiry, email: 'bad\nemail' })).status, 400);
  assert.equal((await deliverNewsletter({ email: 'test@example.com', consent: false })).status, 400);
  process.env.RESEND_API_KEY = 'test-key'; process.env.ENQUIRY_FROM_EMAIL = 'website@example.com'; process.env.ENQUIRY_TO_EMAIL = 'team@example.com';
  let outbound;
  assert.equal((await deliverEnquiry(enquiry, async (url, options) => { outbound = { url, options }; return Response.json({ id: 'test-message' }); })).status, 200);
  const payload = JSON.parse(outbound.options.body);
  assert.deepEqual(payload.to, ['team@example.com']); assert.equal(payload.reply_to, 'test@example.com'); assert.match(payload.text, /Destination: Canada/); assert.equal(outbound.options.headers['Idempotency-Key'], 'enquiry-unit-test-submission-123');
  assert.equal((await deliverEnquiry(enquiry, async () => Response.json({ error: 'provider failure' }, { status: 500 }))).status, 502);
  assert.equal((await deliverEnquiry(enquiry, async () => Response.json({}))).status, 502);
  assert.equal((await deliverEnquiry(enquiry, async () => { throw new Error('timeout'); })).status, 502);
  process.env.NEWSLETTER_WEBHOOK_URL = 'https://mailing.example.com/subscribe'; process.env.NEWSLETTER_WEBHOOK_SECRET = 'test-secret';
  assert.equal((await deliverNewsletter({ email: 'test@example.com', consent: true }, async (url, options) => { outbound = { url, options }; return new Response(null, { status: 204 }); })).status, 200);
  assert.equal(outbound.options.headers.Authorization, 'Bearer test-secret'); assert.equal(JSON.parse(outbound.options.body).consent, true);
  assert.equal((await deliverNewsletter({ email: 'test@example.com', consent: true }, async () => new Response(null, { status: 500 }))).status, 502);
  const request = (body, origin='https://pelican.example') => new Request('https://pelican.example/api/enquiries', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body });
  assert.equal((await parseSubmission(request('{}', 'https://other.example'))).status, 403);
  assert.equal((await parseSubmission(request('{'))).status, 400);
  assert.equal((await parseSubmission(request(JSON.stringify({ website: 'spam' })))).status, 400);
  assert.equal((await parseSubmission(request('x'.repeat(65537)))).status, 413);
  assert.deepEqual(await parseSubmission(request(JSON.stringify({ email: 'test@example.com' }))), { email: 'test@example.com' });

  // Rate limit: keyed on the platform IP (x-real-ip), not a spoofable rotating x-forwarded-for.
  const fromIp = (realIp, forwarded) => new Request('https://pelican.example/api/enquiries', { method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': realIp, 'x-forwarded-for': forwarded }, body: '{"email":"a@example.com"}' });
  const statuses = [];
  for (let i = 0; i < 12; i++) { const result = await parseSubmission(fromIp('203.0.113.7', `10.0.0.${i}`)); statuses.push(result instanceof Response ? result.status : 200); }
  assert.deepEqual(statuses.slice(0, 10), Array(10).fill(200)); assert.deepEqual(statuses.slice(10), [429, 429]);

  // Shared store: the count comes from Redis (so it holds across instances); raw IPs never reach the store.
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example'; process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-token';
  let redisCall;
  const redis = (count) => async (url, options) => { redisCall = { url, options }; return Response.json([{ result: count }, { result: 1 }]); };
  assert.equal((await parseSubmission(fromIp('198.51.100.1', ''), redis(11))).status, 429);
  assert.equal(redisCall.url, 'https://redis.example/pipeline'); assert.equal(redisCall.options.headers.Authorization, 'Bearer redis-token');
  assert.ok(!redisCall.options.body.includes('198.51.100.1'));
  assert.deepEqual(await parseSubmission(fromIp('198.51.100.1', ''), redis(1)), { email: 'a@example.com' });
  // Store outage falls back to the local guard instead of rejecting real leads.
  assert.deepEqual(await parseSubmission(fromIp('198.51.100.2', ''), async () => { throw new Error('down'); }), { email: 'a@example.com' });
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;

  // Turnstile: enforced only when configured; token is stripped before delivery.
  process.env.TURNSTILE_SECRET_KEY = 'turnstile-secret';
  const human = (body, ip) => new Request('https://pelican.example/api/enquiries', { method: 'POST', headers: { 'content-type': 'application/json', 'x-real-ip': ip }, body: JSON.stringify(body) });
  const siteverify = (success) => async (url, options) => { assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify'); assert.equal(options.body.get('secret'), 'turnstile-secret'); return Response.json({ success }); };
  assert.equal((await parseSubmission(human({ email: 'a@example.com' }, '192.0.2.1'), siteverify(true))).status, 400);
  assert.equal((await parseSubmission(human({ email: 'a@example.com', turnstileToken: 'bad' }, '192.0.2.2'), siteverify(false))).status, 400);
  assert.deepEqual(await parseSubmission(human({ email: 'a@example.com', turnstileToken: 'good' }, '192.0.2.3'), siteverify(true)), { email: 'a@example.com' });
  assert.deepEqual(await parseSubmission(human({ email: 'a@example.com', turnstileToken: 'good' }, '192.0.2.4'), async () => { throw new Error('cloudflare down'); }), { email: 'a@example.com' });
  delete process.env.TURNSTILE_SECRET_KEY;
  console.log('Submission validation, missing configuration, delivery success/failure, newsletter consent and webhook authentication passed. No live messages sent.');
})().finally(() => { for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]; Object.assign(process.env, saved); }).catch((error) => { console.error(error); process.exitCode = 1; });
