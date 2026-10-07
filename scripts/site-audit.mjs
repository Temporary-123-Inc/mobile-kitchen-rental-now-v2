import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'dist');
const site = JSON.parse(await readFile(join(process.cwd(), 'data', 'site-39.json'), 'utf8'));
const canonicalOrigin = 'https://mobile-kitchen-rental-now.com';
const sitemapXml = await readFile(join(root, 'sitemap.xml'), 'utf8');
const robotsTxt = await readFile(join(root, 'robots.txt'), 'utf8');
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith('.html')) files.push(path);
  }
}

await collect(root);

const failures = [];
const locationHooks = new Map();
let services = 0;
let locations = 0;
let jsonStates = 0;
let jsonCities = 0;
const heroVariations = new Set();

const slugify = (value) => String(value).toLowerCase()
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const strip = (value) => String(value).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const stateByRoute = new Map(site.location_data.state_pages.map((state) => [`service-areas/${slugify(state.state)}/index.html`, state]));
const cityByRoute = new Map(site.service_area_data.map((city) => [`service-areas/${slugify(city.state)}/${city.page_layout_data.slug}/index.html`, city]));
const forbiddenPlaceholder = /\[(?:CONFIRM COMPANY POLICY|DELIVERY POLICY|MINIMUM RENTAL|SERVICE HOURS|EMERGENCY ETA|[A-Z][A-Z _-]{4,})\]/;
const sitemapLocations = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapSet = new Set(sitemapLocations);

if (robotsTxt !== `User-agent: *\nAllow: /\n\nSitemap: ${canonicalOrigin}/sitemap.xml\n`) failures.push('robots.txt: unexpected directives or sitemap URL');
if (sitemapSet.size !== sitemapLocations.length) failures.push('sitemap.xml: duplicate URLs found');
if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">[\s\S]*<\/urlset>\s*$/.test(sitemapXml)) failures.push('sitemap.xml: invalid XML envelope');

for (const path of files) {
  const html = await readFile(path, 'utf8');
  const route = relative(root, path).replaceAll('\\', '/');
  const h1s = [...html.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)];
  const is404 = route === '404.html';
  const publicRoute = route === 'index.html' ? '/' : route.endsWith('/index.html') ? `/${route.slice(0, -'index.html'.length)}` : `/${route}`;
  const canonicalUrl = `${canonicalOrigin}${publicRoute}`;
  const robotTags = [...html.matchAll(/<meta\s+name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/gi)];
  const canonicalTags = [...html.matchAll(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/gi)];

  if (!/<meta\s+name="viewport"/i.test(html)) failures.push(`${route}: missing viewport meta`);
  if (h1s.length !== 1) failures.push(`${route}: expected one H1, found ${h1s.length}`);
  if (robotTags.length !== 1) failures.push(`${route}: expected one robots meta tag, found ${robotTags.length}`);
  else if (robotTags[0][1].replace(/\s/g, '').toLowerCase() !== (is404 ? 'noindex,nofollow' : 'index,follow')) failures.push(`${route}: incorrect robots directive`);
  if (is404) {
    if (canonicalTags.length) failures.push(`${route}: 404 page must not declare a canonical URL`);
    if (sitemapSet.has(canonicalUrl)) failures.push(`${route}: 404 page appears in sitemap`);
  } else {
    if (canonicalTags.length !== 1 || canonicalTags[0][1] !== canonicalUrl) failures.push(`${route}: canonical does not match ${canonicalUrl}`);
    if (!sitemapSet.has(canonicalUrl)) failures.push(`${route}: canonical URL missing from sitemap`);
  }
  if (html.includes('mobile-kitchen-rental-now.vercel.app') || html.includes('www.mobile-kitchen-rental-now.com')) failures.push(`${route}: legacy hostname remains in SEO signals or content`);
  if (!/<a class="header-contact emergency-phone-link" href="tel:\+18336347812"[^>]*>[\s\S]*?\(833\) 634-7812[\s\S]*?<\/a>/i.test(html)) {
    failures.push(`${route}: header emergency phone CTA is missing or not clickable`);
  }
  if (!/<a class="mobile-call mobile-call-refresh emergency-phone-link" href="tel:\+18336347812"[^>]*>[\s\S]*?Emergency rentals[\s\S]*?\(833\) 634-7812[\s\S]*?<\/a>/i.test(html)) {
    failures.push(`${route}: sticky emergency phone CTA is missing or not clickable`);
  }
  if (/(?:\+?1[-.\s]*)?\(?800\)?[-.\s]*(?:205[-.\s]*6106|550[-.\s]*0065)/i.test(html)) {
    failures.push(`${route}: old phone number remains`);
  }
  if (forbiddenPlaceholder.test(html)) failures.push(`${route}: bracketed placeholder remains`);

  const expectedState = stateByRoute.get(route);
  const expectedCity = cityByRoute.get(route);
  if (expectedState) {
    jsonStates += 1;
    const h1Text = strip(h1s[0]?.[0] ?? '');
    if (h1Text !== expectedState.h1) failures.push(`${route}: state H1 does not match JSON`);
    if (!strip(html).includes(strip(expectedState.description))) failures.push(`${route}: state description does not match JSON`);
    if (!html.includes(`$${Number(expectedState.starting_price).toLocaleString('en-US')}`)) failures.push(`${route}: state starting price is missing`);
    const cities = site.service_area_data.filter((city) => city.state === expectedState.state);
    for (const city of cities) {
      const href = `/service-areas/${slugify(city.state)}/${city.page_layout_data.slug}/`;
      if (!html.includes(`href="${href}"`)) failures.push(`${route}: missing city link ${href}`);
    }
  }
  if (expectedCity) {
    jsonCities += 1;
    const page = expectedCity.page_layout_data;
    const h1Text = strip(h1s[0]?.[0] ?? '');
    if (h1Text !== page.h1) failures.push(`${route}: city H1 does not match JSON`);
    if (!strip(html).includes(strip(page.description))) failures.push(`${route}: city description does not match JSON`);
    for (const label of page.breadcrumb_labels) if (!strip(html).includes(label)) failures.push(`${route}: breadcrumb label missing: ${label}`);
    for (const value of [`$${Number(page.starting_price).toLocaleString('en-US')}`, page.delivery_time_range.display, page.estimated_delivery_display, page.delivery_distance.display, page.service_hours]) {
      if (!strip(html).includes(strip(value))) failures.push(`${route}: JSON planning value missing: ${value}`);
    }
    for (const article of page.related_incident_articles ?? []) {
      if (!strip(html).includes(strip(article.title)) || !html.includes(`href="${article.source_url}"`) || !strip(html).includes(article.date)) failures.push(`${route}: assigned article does not match JSON`);
    }
    const variation = html.match(/data-hero-variation="([1-4])"/)?.[1];
    if (!variation) failures.push(`${route}: deterministic hero variation is missing`);
    else heroVariations.add(variation);
  }

  const isService = route.startsWith('services/')
    || /class="(?:service-option-page|model-hero)\b/i.test(html);

  if (isService) {
    services += 1;
    const serviceHeading = h1s[0]?.[0] ?? '';
    const serviceHeadingText = serviceHeading.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const meaningfulWords = serviceHeadingText.match(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g) ?? [];
    if (!serviceHeading.includes('service-keyword-heading')) failures.push(`${route}: service H1 is missing the keyword-heading format`);
    if (meaningfulWords.length < 4) failures.push(`${route}: service H1 has fewer than four meaningful words`);
    if (!/(trailer|facility|facilities|container|equipment|station)/i.test(serviceHeadingText)) failures.push(`${route}: service H1 is missing a physical form`);
    if (!/(rental|rent|lease)/i.test(serviceHeadingText)) failures.push(`${route}: service H1 is missing rental or lease intent`);
    if (/Configured for Your Operation|Delivered Nationwide|Ready When You Need It/i.test(serviceHeadingText)) failures.push(`${route}: service H1 retains removed generic tiers`);
    const hasServiceHeroImage = /class="model-hero\b[\s\S]*?<figure\b/i.test(html)
      || /class="service-category-heading\b[\s\S]*?class="service-category-hero-photo\b/i.test(html)
      || /class="service-directory-hero\b[\s\S]*?class="service-category-hero-photo\b/i.test(html);
    if (!hasServiceHeroImage) failures.push(`${route}: service page is missing a hero image`);
  }

  if (route.startsWith('service-areas/') && route !== 'service-areas/index.html') {
    locations += 1;
  }

  if (route.startsWith('service-areas/') && route !== 'service-areas/index.html' && !expectedState && !expectedCity) {
    const heading = h1s[0]?.[0] ?? '';
    const tiers = heading.match(/<span>/g)?.length ?? 0;
    if (!heading.includes('four-tier-heading') || tiers !== 2) failures.push(`${route}: location H1 is not the two-line location format`);
    if (!heading.includes('Emergency Mobile Kitchen Trailer Rentals')) failures.push(`${route}: location H1 is missing the intact primary phrase`);
    if (!heading.includes('Short-Term or Long-Term Use')) failures.push(`${route}: location H1 is missing rental-duration intent`);
    if (/Planned for Local Site Needs|Ready for Your Project Timeline/i.test(heading)) failures.push(`${route}: location H1 retains removed generic tiers`);

    const hook = html.match(/<p class="location-conversion-hook">([\s\S]*?)<\/p>/i)?.[1];
    if (!hook) failures.push(`${route}: missing local conversion hook`);
    else {
      const hookText = hook.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const hookWords = hookText.split(' ').filter(Boolean).length;
      if (hookWords < 70 || hookWords > 120) failures.push(`${route}: location opening has ${hookWords} words; expected 70-120`);
      if (!/Request .+ availability or a project-specific quote/i.test(hookText)) failures.push(`${route}: location opening is missing the availability/quote invitation`);
      const prior = locationHooks.get(hook);
      if (prior) failures.push(`${route}: duplicate local hook also used by ${prior}`);
      locationHooks.set(hook, route);
    }
  }
}

if (jsonStates !== site.location_data.state_pages.length) failures.push(`authoritative states: rendered ${jsonStates}, expected ${site.location_data.state_pages.length}`);
if (jsonCities !== site.service_area_data.length) failures.push(`authoritative cities: rendered ${jsonCities}, expected ${site.service_area_data.length}`);
if ([...heroVariations].sort().join(',') !== '1,2,3,4') failures.push(`hero variations: found ${[...heroVariations].sort().join(',') || 'none'}, expected 1,2,3,4`);
if (sitemapSet.size !== files.length - 1) failures.push(`sitemap.xml: found ${sitemapSet.size} URLs, expected ${files.length - 1} indexable HTML pages`);

console.log(JSON.stringify({
  pages: files.length,
  servicePages: services,
  locationPages: locations,
  uniqueLocationHooks: locationHooks.size,
  authoritativeStatePages: jsonStates,
  authoritativeCityPages: jsonCities,
  heroVariations: [...heroVariations].sort(),
  sitemapUrls: sitemapSet.size,
  excludedPages: 1,
  failures: failures.length,
}, null, 2));

if (failures.length) {
  console.error(failures.slice(0, 100).join('\n'));
  process.exitCode = 1;
}
