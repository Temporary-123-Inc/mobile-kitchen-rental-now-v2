import assert from 'node:assert/strict';
import handler from '../api/contact.js';

process.env.GLIDE_WEBHOOK_TOKEN = 'test-token';

const validData = {
  url: 'https://mobile-kitchen-rental-now.com/contact-us/',
  name: 'Glide Test Visitor',
  email: 'glide-test@example.com',
  phone: '5551234567',
  message: 'Automated contact endpoint verification message.',
  service: 'temporary-facilities',
  duration: 'under-1-month',
  industry: 'other',
  location: 'Austin, Texas',
  startDate: '2026-10-25',
  consent: true,
};

const response = () => ({
  headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  end(body) { this.body = JSON.parse(body); },
});

const request = (overrides = {}) => ({
  method: 'POST',
  headers: { 'content-length': '600', 'x-vercel-forwarded-for': `test-${Math.random()}`, origin: 'https://mobile-kitchen-rental-now.com' },
  body: { data: validData },
  socket: {},
  ...overrides,
});

let forwarded;
globalThis.fetch = async (url, options) => {
  forwarded = { url, options, body: JSON.parse(options.body) };
  return { ok: true, status: 200 };
};

const accepted = response();
await handler(request(), accepted);
assert.equal(accepted.statusCode, 200);
assert.deepEqual(accepted.body, { ok: true });
assert.equal(forwarded.options.headers.Authorization, 'Bearer test-token');
assert.deepEqual(forwarded.body, { data: validData });

const invalid = response();
await handler(request({ body: { data: { ...validData, consent: false } } }), invalid);
assert.equal(invalid.statusCode, 400);
assert.ok(invalid.body.fields.includes('consent'));

const foreign = response();
await handler(request({ headers: { origin: 'https://attacker.example', 'x-vercel-forwarded-for': 'foreign-origin-test' } }), foreign);
assert.equal(foreign.statusCode, 403);

console.log('Contact API tests passed: valid Glide payload, validation failure, and origin rejection.');
