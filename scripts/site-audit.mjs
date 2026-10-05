import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = join(process.cwd(), 'dist');
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

for (const path of files) {
  const html = await readFile(path, 'utf8');
  const route = relative(root, path).replaceAll('\\', '/');
  const h1s = [...html.matchAll(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi)];

  if (!/<meta\s+name="viewport"/i.test(html)) failures.push(`${route}: missing viewport meta`);
  if (h1s.length !== 1) failures.push(`${route}: expected one H1, found ${h1s.length}`);
  if (!/<a class="header-contact emergency-phone-link" href="tel:\+18336347812"[^>]*>[\s\S]*?\(833\) 634-7812[\s\S]*?<\/a>/i.test(html)) {
    failures.push(`${route}: header emergency phone CTA is missing or not clickable`);
  }
  if (!/<a class="mobile-call mobile-call-refresh emergency-phone-link" href="tel:\+18336347812"[^>]*>[\s\S]*?Emergency rentals[\s\S]*?\(833\) 634-7812[\s\S]*?<\/a>/i.test(html)) {
    failures.push(`${route}: sticky emergency phone CTA is missing or not clickable`);
  }
  if (/(?:\+?1[-.\s]*)?\(?800\)?[-.\s]*(?:205[-.\s]*6106|550[-.\s]*0065)/i.test(html)) {
    failures.push(`${route}: old phone number remains`);
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

console.log(JSON.stringify({
  pages: files.length,
  servicePages: services,
  locationPages: locations,
  uniqueLocationHooks: locationHooks.size,
  failures: failures.length,
}, null, 2));

if (failures.length) {
  console.error(failures.slice(0, 100).join('\n'));
  process.exitCode = 1;
}
