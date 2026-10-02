import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const titleCase = (value) => value
  .split('-')
  .map((word) => word === 'ada' ? 'ADA' : word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

const plainText = (value) => value
  .replace(/<!--.*?-->/gs, '')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const serviceLabel = (heading) => {
  if (/dishwash/i.test(heading)) return 'Commercial Dishwashing Trailers';
  if (/shower.*restroom|restroom.*shower|combination/i.test(heading)) return 'Shower & Restroom Trailers';
  if (/kitchen/i.test(heading)) return 'Mobile Kitchen Trailers';
  if (/man camp|workforce|housing|sleeper|berthing/i.test(heading)) return 'Workforce Support Facilities';
  if (/refrigerat|cold storage|freezer/i.test(heading)) return 'Refrigeration & Cold Storage';
  if (/handwash/i.test(heading)) return 'Handwashing Facilities';
  if (/laundry/i.test(heading)) return 'Mobile Laundry Facilities';
  if (/restroom/i.test(heading)) return 'Commercial Restroom Trailers';
  if (/shower/i.test(heading)) return 'Commercial Shower Trailers';
  return 'Temporary Facility Rentals';
};

const fourTierHeading = (tiers, label) => `<h1 class="four-tier-heading" aria-label="${escapeHtml(label)}">${tiers
  .map((tier) => `<span>${escapeHtml(tier)}</span>`)
  .join('')}</h1>`;

const enhancePage = (html, relativePath) => {
  const normalized = relativePath.replaceAll('\\', '/');
  const headingMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!headingMatch) return html;

  const originalHeading = plainText(headingMatch[1]);
  const isService = normalized.startsWith('services/');
  const isLocation = normalized.startsWith('service-areas/') && normalized !== 'service-areas/index.html';

  if (isService) {
    html = html.replace(
      headingMatch[0],
      fourTierHeading([
        originalHeading,
        'Configured for Your Operation.',
        'Delivered Nationwide.',
        'Ready When You Need It.',
      ], originalHeading),
    );
  }

  if (isLocation) {
    const segments = normalized.split('/').slice(1, -1);
    const state = titleCase(segments[0]);
    const isCityDirectory = segments.at(-1) === 'cities';
    const location = titleCase(isCityDirectory ? segments.at(-2) : segments.at(-1));
    const offering = isCityDirectory ? 'Temporary Facility Rentals' : serviceLabel(originalHeading);
    const localHook = isCityDirectory
      ? `Explore temporary facility rental coverage for communities across ${location}. Choose the closest listed location, then share your ${state} delivery address, operating window, utility access, and capacity needs so our team can prepare a practical equipment and deployment plan.`
      : `Keep your ${location} operation moving with ${offering.toLowerCase()} planned around local site access, utilities, crew demand, and delivery timing. Share your site address, operating window, and capacity needs so our team can match the right configuration and prepare a practical deployment plan for your ${state} project.`;

    html = html.replace(
      headingMatch[0],
      fourTierHeading([
        isCityDirectory ? `${location} Service Area` : location,
        offering,
        'Planned for Local Site Needs.',
        'Ready for Your Project Timeline.',
      ], `${location} ${offering}`),
    );

    const introMatch = html.match(/<p class="(?:region-intro|city-lead)"[^>]*>|<p data-h1-intro="true"[^>]*>/i);
    if (introMatch) {
      html = html.replace(
        introMatch[0],
        `<p class="location-conversion-hook">${escapeHtml(localHook)}</p>${introMatch[0]}`,
      );
    }
  }

  return html;
};
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'mirror'), dist, { recursive: true });
await cp(join(root, 'assets'), join(dist, 'assets'), { recursive: true });
await cp(join(root, 'site.webmanifest'), join(dist, 'site.webmanifest'));

async function versionSharedStyles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return versionSharedStyles(path);
    if (!entry.name.endsWith('.html')) return;

    const html = await readFile(path, 'utf8');
    const versioned = html.replaceAll(
      '/assets/brand-modern.css',
      '/assets/brand-modern.css?v=contrast-20261003',
    );
    const updated = enhancePage(versioned, path.slice(dist.length + 1));
    if (updated !== html) await writeFile(path, updated);
  }));
}

await versionSharedStyles(dist);
console.log('Static site built in dist/');
