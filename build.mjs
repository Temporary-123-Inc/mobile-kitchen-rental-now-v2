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

const bulkKitchenGallery = [
  ['26ft-baby-bulk-kitchen-trailer-entrance.png', '26 ft bulk mobile kitchen trailer entrance', 'exterior', 'Exterior', 1085, 1449],
  ['26ft-baby-bulk-kitchen-trailer-interior.png', '26 ft bulk mobile kitchen trailer interior', 'interior', 'Interior', 1086, 1448],
  ['26ft-baby-bulk-kitchen-griddle-cooking-line-1.png', '26 ft bulk mobile kitchen griddle cooking line, view 1', 'cooking-line', 'Cooking line', 1086, 1448],
  ['26ft-baby-bulk-kitchen-griddle-cooking-line-2.png', '26 ft bulk mobile kitchen griddle cooking line, view 2', 'cooking-line', 'Cooking line', 1085, 1449],
  ['26ft-baby-bulk-kitchen-commercial-fryers.png', 'Commercial fryers in the 26 ft bulk mobile kitchen', 'equipment', 'Fryers', 1086, 1448],
  ['26ft-baby-bulk-kitchen-tilting-skillet.png', 'Tilting skillet in the 26 ft bulk mobile kitchen', 'equipment', 'Tilting skillet', 1086, 1448],
  ['26ft-baby-bulk-kitchen-commercial-oven.png', 'Commercial oven in the 26 ft bulk mobile kitchen', 'equipment', 'Oven', 1086, 1448],
  ['26ft-baby-bulk-kitchen-commercial-refrigerator.png', 'Commercial refrigerator in the 26 ft bulk mobile kitchen', 'equipment', 'Refrigeration', 1085, 1449],
  ['26ft-baby-bulk-kitchen-three-compartment-sink.png', 'Three-compartment sink in the 26 ft bulk mobile kitchen', 'washing', 'Three-compartment sink', 1086, 1448],
  ['26ft-baby-bulk-kitchen-hand-wash-sink.png', 'Hand-wash sink in the 26 ft bulk mobile kitchen', 'washing', 'Hand-wash sink', 1085, 1449],
  ['26ft-baby-bulk-kitchen-storage-rack.png', 'Storage rack in the 26 ft bulk mobile kitchen', 'storage', 'Storage', 1086, 1448],
];

const render26ftBulkGallery = () => {
  const carouselId = 'service-carousel-26ft-bulk-kitchen';
  const slides = bulkKitchenGallery.map(([file, alt, view], index) => {
    const source = `/assets/26ft-bulk-gallery/${file}`;
    const active = index === 0;
    return `<div class="service-carousel-slide" data-carousel-slide="true" data-image-view="${view}" data-active="${active}"${active ? '' : ' aria-hidden="true"'}><button type="button" class="service-carousel-zoom" data-carousel-zoom="true" aria-label="View full image: ${escapeHtml(alt)}" aria-haspopup="dialog"><img src="${source}" sizes="(max-width: 700px) calc(100vw - 36px), (max-width: 1100px) 48vw, 620px" width="${bulkKitchenGallery[index][4]}" height="${bulkKitchenGallery[index][5]}" alt="${active ? escapeHtml(alt) : ''}" data-carousel-alt="${escapeHtml(alt)}" data-carousel-full-src="${source}" loading="${active ? 'eager' : 'lazy'}" fetchpriority="${active ? 'high' : 'low'}" decoding="async"><span class="service-carousel-zoom-hint" aria-hidden="true">View full image</span></button></div>`;
  }).join('');
  const thumbnails = bulkKitchenGallery.map(([file, alt, view, viewLabel, width, height], index) => {
    const source = `/assets/26ft-bulk-gallery/${file}`;
    return `<button type="button" data-carousel-select="${index}" aria-label="Show ${escapeHtml(alt)}" aria-pressed="${index === 0}" data-carousel-view="${view}" data-carousel-view-label="${escapeHtml(viewLabel)}"><img src="${source}" sizes="88px" width="${width}" height="${height}" alt="" loading="lazy" decoding="async"><span aria-hidden="true">${escapeHtml(viewLabel)}</span></button>`;
  }).join('');

  return `<figure class="service-hero-carousel" data-service-carousel="true" data-custom-gallery="26ft-bulk" data-carousel-autoplay="true" data-carousel-interval="5500" data-carousel-lightbox-label="26ft Bulk Mobile Kitchen" aria-label="26ft Bulk Mobile Kitchen images" aria-roledescription="carousel" tabindex="0"><div class="service-carousel-viewport" id="${carouselId}">${slides}<div class="service-carousel-overlay" aria-hidden="true"><span data-carousel-view="true">Exterior</span><span><b data-carousel-position-overlay="true">1</b> / ${bulkKitchenGallery.length}</span></div><button type="button" class="service-carousel-arrow service-carousel-arrow--previous" data-carousel-previous="true" aria-controls="${carouselId}" aria-label="Previous 26ft Bulk Mobile Kitchen image"><span aria-hidden="true">←</span></button><button type="button" class="service-carousel-arrow service-carousel-arrow--next" data-carousel-next="true" aria-controls="${carouselId}" aria-label="Next 26ft Bulk Mobile Kitchen image"><span aria-hidden="true">→</span></button></div><div class="service-carousel-controls"><div><strong>Explore the equipment</strong><small data-carousel-behavior="true">Auto-advances. Choosing an image pauses the slideshow.</small></div><div class="service-carousel-actions"><p class="service-carousel-status" aria-live="off" aria-atomic="true"><span data-carousel-position="true">1</span> of ${bulkKitchenGallery.length}</p><button type="button" class="service-carousel-toggle" data-carousel-toggle="true" aria-label="Pause 26ft Bulk Mobile Kitchen slideshow">Pause</button></div></div><div class="service-carousel-thumbnails" aria-label="Choose an image">${thumbnails}</div></figure>`;
};

const enhancePage = (html, relativePath) => {
  const normalized = relativePath.replaceAll('\\', '/');
  if (normalized === 'services/mobile-kitchen-trailers/26ft-bulk/index.html') {
    html = html.replace(
      /<figure class="service-hero-carousel"[\s\S]*?<\/figure>/i,
      render26ftBulkGallery(),
    );
    html = html.replace(
      '</head>',
      '<script src="/assets/26ft-bulk-gallery.js?v=20261003" defer></script></head>',
    );
  }
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
      '/assets/brand-modern.css?v=service-strip-hover-20261003',
    );
    const updated = enhancePage(versioned, path.slice(dist.length + 1));
    if (updated !== html) await writeFile(path, updated);
  }));
}

await versionSharedStyles(dist);
console.log('Static site built in dist/');
