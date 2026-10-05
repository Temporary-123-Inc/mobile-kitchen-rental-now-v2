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

const fourTierHeading = (tiers, label) => `<h1 class="four-tier-heading" aria-label="${escapeHtml(label)}">${tiers
  .map((tier) => `<span>${escapeHtml(tier)}</span>`)
  .join('')}</h1>`;

const servicePrimaryPhrase = (heading, route) => {
  if (route === 'services/index.html') return 'Temporary Commercial Facility Rental Services Nationwide';
  if (/hands-free handwashing/i.test(heading)) return 'Portable Hands-Free Handwashing Facility Rentals';
  if (/mobile kitchen/i.test(heading) && !/(trailer|facility|container|equipment)/i.test(heading)) {
    return heading.replace(/\s+Rental$/i, ' Trailer Rental');
  }
  const rentalPhrase = heading.replace(/\s+Rental$/i, ' Rentals');
  const meaningfulWords = rentalPhrase.match(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g) ?? [];
  return meaningfulWords.length >= 4 ? rentalPhrase : `Commercial ${rentalPhrase}`;
};

const serviceCategoryHeroImages = {
  'services/index.html': ['https://mobile-kitchen-facility-rental.com/images/location-verified/d845978efea5edbfc3d7-960.webp', 960, 1280, 'Mobile kitchen aisle with stainless counters and commercial cooking equipment', 'Commercial mobile kitchen rental equipment'],
  'equipment-rental/mobile-kitchen-trailers/index.html': ['https://mobile-kitchen-facility-rental.com/images/location-verified/d845978efea5edbfc3d7-960.webp', 960, 1280, 'Mobile kitchen aisle with stainless counters and commercial cooking equipment', 'Commercial mobile kitchen trailer interior'],
  'portable-dishwashing-trailer-rental/index.html': ['https://mobile-kitchen-facility-rental.com/images/service-heroes/22-26ft-low-temp-dish/01-960.webp', 960, 720, 'Commercial dishwashing trailer interior with dedicated warewashing equipment', 'Commercial dishwashing trailer interior'],
  'equipment-rental/refrigeration/index.html': ['https://mobile-kitchen-facility-rental.com/images/location-verified/87e877cda19ee1b0f5d2-960.webp', 960, 1280, 'Insulated refrigerated trailer interior with a ceiling-mounted cooling unit', 'Commercial refrigerated trailer interior'],
  'equipment-rental/shower-trailer/index.html': ['https://mobile-kitchen-facility-rental.com/images/location-verified/dabab6914d03a327f753-960.webp', 960, 1280, 'Private mobile shower stall with overhead and hand shower fixtures', 'Mobile shower trailer interior'],
  'equipment-rental/restroom-trailers/index.html': ['https://mobile-kitchen-facility-rental.com/images/catalog-supplied/restroom-trailers/01-960.webp', 960, 1277, 'Toilet and wall-mounted sink inside a commercial mobile restroom trailer', 'Commercial restroom trailer interior'],
  'equipment-rental/mobile-sleep-trailers/index.html': ['https://mobile-kitchen-facility-rental.com/media/4b67ae2ec507c379fdf9a7e3.png', 850, 650, 'Communal bunk-bed sleeping area inside a mobile sleeper trailer', 'Mobile sleeper trailer interior'],
  'equipment-rental/laundry-trailers/index.html': ['https://mobile-kitchen-facility-rental.com/images/service-heroes/26-27ft-laundry-trailer/01-960.webp', 939, 1675, 'Commercial laundry trailer interior with washer and dryer equipment', 'Commercial laundry trailer interior'],
  'equipment-rental/handwashing-stations/index.html': ['https://mobile-kitchen-facility-rental.com/images/location-verified/009fbde78d1a8d2342be-960.webp', 960, 734, 'Exterior of a handwashing trailer with sinks positioned beneath an awning', 'Portable handwashing trailer'],
  'services/shower-restroom-combination-trailers/index.html': ['https://mobile-kitchen-facility-rental.com/images/location-verified/5ecedc2b7190aeb0b3f7-960.webp', 960, 1273, 'Shower and toilet enclosure inside a combination trailer', 'Shower and restroom combination trailer interior'],
};

const renderServiceCategoryHero = ([source, width, height, alt, caption]) => {
  const srcset = source.endsWith('-960.webp')
    ? ` srcset="${source.replace('-960.webp', '-480.webp')} 480w, ${source} 960w"`
    : '';
  return `<figure class="service-category-hero-photo"><img src="${source}"${srcset} sizes="(max-width: 760px) calc(100vw - 32px), 36vw" width="${width}" height="${height}" alt="${escapeHtml(alt)}" loading="eager" fetchpriority="high" decoding="async"><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
};

const stableIndex = (value, length) => {
  let hash = 0;
  for (const character of value) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return hash % length;
};

const kitchenFamilyRotations = [
  'Commercial Dishwashing Trailers and Refrigeration Trailers',
  'Walk-In Coolers and Walk-In Freezers',
  'Portable Dishwashing Trailers and Refrigerated Containers',
  'Commercial Refrigeration Trailers and Walk-In Coolers',
  'Dishwashing Trailers and Walk-In Freezers',
];

const locationOpening = (location, state, familyPhrase, route) => {
  const audiences = [
    'restaurants, institutions, contractors, and public agencies',
    'food-service operators, healthcare teams, schools, and project contractors',
    'commercial kitchens, institutional dining teams, response crews, and remote projects',
    'hospitality operators, government teams, campuses, and construction projects',
  ];
  const planningDetails = [
    'meal volume, cooking workflow, utility connections, and delivery access',
    'menu demands, operating hours, site utilities, and equipment placement',
    'production capacity, warewashing flow, cold storage, and site access',
    'service schedule, preparation space, power, water, and delivery logistics',
  ];
  const variation = stableIndex(route, audiences.length);
  return `${location} emergency mobile kitchen trailer rentals help ${audiences[variation]} maintain food service during urgent interruptions and planned renovations. Supporting ${familyPhrase.toLowerCase()} can be coordinated with the kitchen when the project requires additional sanitation or temperature-controlled capacity. Short-term and long-term rental plans are matched to ${planningDetails[(variation + 1) % planningDetails.length]}, with delivery and setup requirements reviewed for the ${state} site. Request ${location} availability or a project-specific quote to confirm the right configuration and schedule.`;
};

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
  html = html
    .replaceAll('="/images/', '="https://mobile-kitchen-facility-rental.com/images/')
    .replaceAll(', /images/', ', https://mobile-kitchen-facility-rental.com/images/')
    .replaceAll('tel:+18002056106', 'tel:+18336347812')
    .replaceAll('"telephone":"+1-800-205-6106"', '"telephone":"+1-833-634-7812"')
    .replace(/(?:\+?1[-.\s]*)?\(?800\)?[-.\s]*(?:205[-.\s]*6106|550[-.\s]*0065)/g, '(833) 634-7812')
    .replace(
      /<a class="header-contact" href="\/contact-us\/">([\s\S]*?<\/svg>)<span>[\s\S]*?<\/span><strong>[\s\S]*?<\/strong><\/a>/i,
      '<a class="header-contact emergency-phone-link" href="tel:+18336347812" aria-label="Call (833) 634-7812 for emergency rentals">$1<span>Emergency rentals</span><strong>(833) 634-7812</strong></a>',
    )
    .replace(
      /<a class="mobile-call mobile-call-refresh" href="\/contact-us\/">[\s\S]*?(<svg class="mobile-phone-icon"[\s\S]*?<\/svg>)<\/a>/i,
      '<a class="mobile-call mobile-call-refresh emergency-phone-link" href="tel:+18336347812" aria-label="Call (833) 634-7812 for emergency rentals"><span>Emergency rentals</span><strong>(833) 634-7812</strong>$1</a>',
    );
  if (normalized === 'index.html') {
    const heroDescription = 'Rent emergency mobile kitchen trailers for renovations, planned shutdowns, disaster response, and remote food-service projects nationwide. Our team helps match commercial cooking equipment, preparation space, utilities, delivery access, and operating schedules to your menu, meal volume, site, and project timeline. Call (833) 634-7812 or send your project details to confirm the right kitchen configuration, current availability, delivery plan, setup requirements, and timing.';
    html = html
      .replace(
        /<h1 id="rental-title"[^>]*>[\s\S]*?<\/h1><p data-h1-intro="true">[\s\S]*?<\/p>/i,
        `<h1 id="rental-title" class="tiered-headline"><span>Emergency Mobile Kitchen Trailer Rentals</span><span>Built for Food Service.</span><span>Delivered Nationwide.</span><span>Planned Around Your Site.</span></h1><p data-h1-intro="true">${heroDescription}</p>`,
      )
      .replaceAll('Call 24/7 emergency rentals', 'Call for rental planning')
      .replaceAll('24/7 EMERGENCY RENTALS', 'EMERGENCY KITCHEN PLANNING')
      .replaceAll('Temporary Commercial Mobile Kitchen Trailer Rentals Nationwide', 'Emergency Mobile Kitchen Trailer Rentals Nationwide')
      .replaceAll('Rent commercial kitchen trailers, modular kitchens and temporary kitchen facilities nationwide for planned projects, disaster response and 24/7 emergencies.', 'Rent emergency mobile kitchen trailers nationwide for renovations, planned shutdowns, disaster response, and remote food-service projects.');
  }
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
  const isService = normalized.startsWith('services/')
    || /class="(?:service-option-page|model-hero)\b/i.test(html);
  const isLocation = normalized.startsWith('service-areas/') && normalized !== 'service-areas/index.html';

  if (isService) {
    const primaryPhrase = servicePrimaryPhrase(originalHeading, normalized);
    html = html.replace(
      headingMatch[0],
      `<h1 class="service-keyword-heading">${escapeHtml(primaryPhrase)}</h1>`,
    );
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(primaryPhrase)} | Mobile Kitchen Rental Now</title>`)
      .replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${escapeHtml(primaryPhrase)} | Mobile Kitchen Rental Now">`)
      .replace(/<meta name="twitter:title" content="[^"]*">/i, `<meta name="twitter:title" content="${escapeHtml(primaryPhrase)} | Mobile Kitchen Rental Now">`)
      .replace(/("@type":"WebPage"[\s\S]*?"name":")[^"]*/i, `$1${primaryPhrase}`);

    const categoryHeroImage = serviceCategoryHeroImages[normalized];
    if (categoryHeroImage && /class="service-category-heading\b/i.test(html)) {
      html = html.replace(
        '<div class="service-category-actions">',
        `<div class="service-category-actions">${renderServiceCategoryHero(categoryHeroImage)}`,
      );
    }

    if (normalized === 'services/index.html' && categoryHeroImage) {
      html = html.replace(
        /(<span class="eyebrow">[\s\S]*?<\/span><nav class="breadcrumb"[\s\S]*?<\/nav><h1[^>]*>[\s\S]*?<\/h1><p class="directory-intro"[^>]*>[\s\S]*?<\/p>)/i,
        `<div class="service-directory-hero"><div>$1</div>${renderServiceCategoryHero(categoryHeroImage)}</div>`,
      );
    }
  }

  if (isLocation) {
    const segments = normalized.split('/').slice(1, -1);
    const state = titleCase(segments[0]);
    const isCityDirectory = segments.at(-1) === 'cities';
    const place = titleCase(isCityDirectory ? segments.at(-2) : segments.at(-1));
    const location = segments.length === 1
      ? state
      : isCityDirectory
        ? `Cities Across ${place}, ${state}`
        : `${place}, ${state}`;
    const familyPhrase = kitchenFamilyRotations[stableIndex(normalized, kitchenFamilyRotations.length)];
    const primaryPhrase = 'Emergency Mobile Kitchen Trailer Rentals';
    const h1Label = `${location} ${primaryPhrase} — ${familyPhrase} for Short-Term or Long-Term Use`;
    const localHook = locationOpening(location, state, familyPhrase, normalized);
    const metaDescription = `${location} emergency mobile kitchen trailer rentals with ${familyPhrase.toLowerCase()} for short-term or long-term projects. Request availability and a project-specific quote.`;

    html = html.replace(
      headingMatch[0],
      fourTierHeading([
        `${location} ${primaryPhrase}`,
        `— ${familyPhrase} for Short-Term or Long-Term Use`,
      ], h1Label),
    );
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(h1Label)} | Mobile Kitchen Rental Now</title>`)
      .replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${escapeHtml(metaDescription)}">`)
      .replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${escapeHtml(h1Label)} | Mobile Kitchen Rental Now">`)
      .replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${escapeHtml(metaDescription)}">`)
      .replace(/<meta name="twitter:title" content="[^"]*">/i, `<meta name="twitter:title" content="${escapeHtml(h1Label)} | Mobile Kitchen Rental Now">`)
      .replace(/<meta name="twitter:description" content="[^"]*">/i, `<meta name="twitter:description" content="${escapeHtml(metaDescription)}">`)
      .replace(/("@type":"WebPage"[\s\S]*?"name":")[^"]*(","description":")[^"]*/i, `$1${h1Label}$2${metaDescription}`);

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
      '/assets/brand-modern.css?v=service-hero-h1-20261005',
    );
    const updated = enhancePage(versioned, path.slice(dist.length + 1));
    if (updated !== html) await writeFile(path, updated);
  }));
}

await versionSharedStyles(dist);
console.log('Static site built in dist/');
