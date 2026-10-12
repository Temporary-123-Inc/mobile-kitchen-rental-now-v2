const GLIDE_WEBHOOK_URL = 'https://go.glideapps.com/api/container/plugin/webhook-trigger/Ib0KuaC09ER734gOAFhJ/b8ca71bc-dcf2-47e3-819a-6bfc4d9fd192';
const ALLOWED_HOSTS = new Set([
  'mobile-kitchen-rental-now.com',
  'www.mobile-kitchen-rental-now.com',
]);

const limits = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_BODY_BYTES = 12_000;

const clean = (value, maximum) => typeof value === 'string' ? value.trim().slice(0, maximum) : '';
const allowed = (value, choices) => choices.includes(value) ? value : '';

const clientAddress = (request) => clean(request.headers['x-vercel-forwarded-for'] || request.socket?.remoteAddress, 120);

const withinRateLimit = (key) => {
  const now = Date.now();
  const entry = limits.get(key);
  if (!entry || now - entry.startedAt >= WINDOW_MS) {
    limits.set(key, { count: 1, startedAt: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_REQUESTS;
};

const validPageUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) return '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
};

const json = (response, status, body) => {
  response.statusCode = status;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { ok: false, error: 'Method not allowed.' });
  }

  const origin = clean(request.headers.origin, 300);
  if (origin) {
    try {
      if (!ALLOWED_HOSTS.has(new URL(origin).hostname)) return json(response, 403, { ok: false, error: 'Origin not allowed.' });
    } catch {
      return json(response, 403, { ok: false, error: 'Origin not allowed.' });
    }
  }

  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) return json(response, 413, { ok: false, error: 'Request is too large.' });
  if (!withinRateLimit(clientAddress(request) || 'unknown')) {
    response.setHeader('Retry-After', '600');
    return json(response, 429, { ok: false, error: 'Please wait before sending another request.' });
  }
  if (!process.env.GLIDE_WEBHOOK_TOKEN) return json(response, 503, { ok: false, error: 'Form delivery is temporarily unavailable.' });

  const input = request.body?.data ?? request.body ?? {};
  if (clean(input.website, 200)) return json(response, 200, { ok: true });

  const data = {
    url: validPageUrl(input.url),
    name: clean(input.name, 100),
    email: clean(input.email, 254).toLowerCase(),
    phone: clean(input.phone, 30),
    message: clean(input.message, 3000),
    service: allowed(clean(input.service, 80), ['mobile-kitchens', 'dishwashing', 'refrigeration', 'restroom-shower-trailers', 'sleeper', 'laundry', 'sink', 'workforce-housing', 'temporary-facilities', 'multiple']),
    duration: allowed(clean(input.duration, 40), ['under-1-month', '1-3-months', '3-6-months', '6-plus-months', 'not-sure']),
    industry: allowed(clean(input.industry, 40), ['construction', 'government', 'food-service', 'emergency-response', 'other']),
    location: clean(input.location, 160),
    startDate: clean(input.startDate, 10),
    consent: input.consent === true,
  };

  const errors = [];
  if (!data.url) errors.push('url');
  if (!data.name) errors.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('email');
  if (!data.phone) errors.push('phone');
  if (data.message.length < 20) errors.push('message');
  if (!data.service) errors.push('service');
  if (!data.duration) errors.push('duration');
  if (!data.industry) errors.push('industry');
  if (!data.location) errors.push('location');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.startDate)) errors.push('startDate');
  if (!data.consent) errors.push('consent');
  if (errors.length) return json(response, 400, { ok: false, error: 'Please complete all required fields.', fields: errors });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const glideResponse = await fetch(GLIDE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GLIDE_WEBHOOK_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!glideResponse.ok) {
      console.error('Glide webhook rejected a contact request', { status: glideResponse.status });
      return json(response, 502, { ok: false, error: 'We could not deliver your request. Please call (833) 634-7812.' });
    }
    return json(response, 200, { ok: true });
  } catch (error) {
    console.error('Glide webhook delivery failed', { name: error?.name || 'Error' });
    return json(response, 502, { ok: false, error: 'We could not deliver your request. Please call (833) 634-7812.' });
  }
}
