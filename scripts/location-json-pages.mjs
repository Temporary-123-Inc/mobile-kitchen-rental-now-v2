import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SITE_ORIGIN = 'https://mobile-kitchen-rental-now.com';

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const slugify = (value) => String(value).toLowerCase()
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const money = (value) => `$${Number(value).toLocaleString('en-US')}`;
const PHONE_LINK = '<a class="button json-phone-cta" href="tel:+18336347812" aria-label="Emergency call, 24/7 availability, (833) 634-7812"><span><b>Emergency</b><small>24/7 availability</small></span><strong>(833) 634-7812</strong></a>';
const HERO_IMAGE = 'https://mobile-kitchen-facility-rental.com/media/equipment-drive/mobile-kitchens/28ft-mobile-kitchen/commercial-mobile-kitchen-cooking-line.png';

const replaceHead = (html, { title, description, canonical }) => html
  .replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)} | Mobile Kitchen Rental Now</title>`)
  .replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${esc(description)}">`)
  .replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${esc(title)} | Mobile Kitchen Rental Now">`)
  .replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${esc(description)}">`)
  .replace(/<meta name="twitter:title" content="[^"]*">/i, `<meta name="twitter:title" content="${esc(title)} | Mobile Kitchen Rental Now">`)
  .replace(/<meta name="twitter:description" content="[^"]*">/i, `<meta name="twitter:description" content="${esc(description)}">`)
  .replace(/<link rel="canonical" href="[^"]*">/i, `<link rel="canonical" href="${SITE_ORIGIN}${canonical}">`);

const breadcrumb = (items) => `<nav class="breadcrumb json-breadcrumb" aria-label="Breadcrumb">${items.map((item, index) => {
  const separator = index ? '<span aria-hidden="true">/</span>' : '';
  return `${separator}${item.href ? `<a href="${item.href}">${esc(item.label)}</a>` : `<span aria-current="page">${esc(item.label)}</span>`}`;
}).join('')}</nav>`;

const priceCards = (record, site) => {
  const prices = record.prices_after_city_discount;
  const refrigerator = site.service_profile.pricing.temporary_refrigerator_trailer.size_prices;
  return `<div class="json-price-grid" aria-label="Kitchen and refrigerator starting prices">
    ${Object.entries(prices).map(([size, price]) => `<article><span>${esc(size.replace('_', ' '))} kitchen</span><strong>${money(price)}</strong><small>City-adjusted starting estimate</small></article>`).join('')}
    ${Object.entries(refrigerator).map(([size, price]) => `<article class="json-price-card--cold"><span>${esc(size.replace('_', ' '))} refrigerator</span><strong>${money(price)}</strong><small>Site-wide price; city ETA discount not applied</small></article>`).join('')}
  </div>`;
};

const inventoryModule = (site) => `<section class="json-section json-inventory" aria-labelledby="inventory-heading"><div class="wrap section">
  <span class="eyebrow">KITCHEN-FAMILY INVENTORY</span><h2 id="inventory-heading">Kitchen, dishwasher, and refrigerator options</h2>
  <p>${esc(site.inventory.family_definition)}</p>
  <div class="json-module-grid">${site.inventory.families.map((family) => `<article><h3>${esc(family.name)}</h3><ul>${family.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></article>`).join('')}</div>
  <p class="json-note">${esc(site.inventory.inventory_status)}</p>
</div></section>`;

const processModule = (site) => `<section class="json-section json-process" aria-labelledby="process-heading"><div class="wrap section">
  <span class="eyebrow">PHASED RENOVATION PLAN</span><h2 id="process-heading">Plan capacity around each renovation phase</h2>
  <div class="json-process-grid">${site.rental_process.map((step) => `<article><span>${String(step.step).padStart(2, '0')}</span><h3>${esc(step.title)}</h3><p>${esc(step.description)}</p></article>`).join('')}</div>
</div></section>`;

const operationsModule = (site) => {
  const utilities = site.service_profile.utilities_plan;
  const sanitation = site.service_profile.sanitation_plan;
  return `<section class="json-section json-operations" aria-labelledby="operations-heading"><div class="wrap section">
    <span class="eyebrow">SITE READINESS</span><h2 id="operations-heading">Utilities, sanitation, and connection planning</h2>
    <div class="json-module-grid"><article><h3>Utilities and access</h3><p>${esc(utilities.power)}</p><p>${esc(utilities.water_supply)}</p><p>${esc(utilities.wastewater)}</p><p>${esc(utilities.site_access)}</p><p>${esc(utilities.confirmation_note)}</p></article>
    <article><h3>Sanitation plan</h3><p>${esc(sanitation.purpose)}</p><ul>${sanitation.before_delivery.map((item) => `<li>${esc(item)}</li>`).join('')}</ul><p>${esc(sanitation.confirmation_note)}</p></article></div>
  </div></section>`;
};

const faqModule = (site) => `<section class="json-section json-faq" aria-labelledby="json-faq-heading"><div class="wrap section">
  <span class="eyebrow">PLANNING QUESTIONS</span><h2 id="json-faq-heading">Frequently asked questions</h2>
  <div class="faq-list">${site.faqs.map((faq) => `<details class="faq-item"><summary>${esc(faq.question)}<span aria-hidden="true">+</span></summary><p>${esc(faq.answer)}</p></details>`).join('')}</div>
</div></section>`;

const uniqueRecords = (records) => [...new Map(records.filter(Boolean).map((record) => [
  `${record.representative_city}, ${record.state}`.toLowerCase(), record,
])).values()];

const neighboringMarketFallback = {
  Arizona: 'Las Vegas, Nevada',
  Delaware: 'Baltimore, Maryland',
  Indiana: 'Cincinnati, Ohio',
};

const nearbyRecordsForCity = (record, cityLookup, stateCities) => {
  const direct = (record.nearby_service_area_data ?? []).map((area) => cityLookup.get(area.label.toLowerCase()));
  const secondDegree = stateCities.flatMap((city) => (city.nearby_service_area_data ?? [])
    .map((area) => cityLookup.get(area.label.toLowerCase())));
  const fallback = cityLookup.get(neighboringMarketFallback[record.state]?.toLowerCase());
  return uniqueRecords([record, ...direct, ...stateCities, ...secondDegree, fallback])
    .slice(0, 6);
};

const nearbyRecordsForState = (state, cities, cityLookup) => uniqueRecords([
  ...cities,
  ...cities.flatMap((city) => (city.nearby_service_area_data ?? [])
    .map((area) => cityLookup.get(area.label.toLowerCase()))),
  cityLookup.get(neighboringMarketFallback[state]?.toLowerCase()),
]).slice(0, 6);

const localPlanningSection = ({ location, nearbyRecords, isState = false }) => {
  const headingId = `local-planning-${slugify(location)}`;
  const scope = isState ? `throughout ${location}` : `in ${location}`;
  const cityLinks = nearbyRecords.map((city) => {
    const href = `/service-areas/${slugify(city.state)}/${city.page_layout_data.slug}/`;
    const label = `${city.representative_city}, ${city.state}`;
    return `<li><a href="${href}"><strong>Temporary Mobile Kitchen Trailer Rental in ${esc(label)}</strong><span>Review city-specific delivery planning, starting estimates, equipment options, and project details.</span></a></li>`;
  }).join('');
  return `<section class="json-section json-local-planning" aria-labelledby="${headingId}"><div class="wrap section">
    <div class="json-local-planning-heading"><span class="eyebrow">LOCAL PROJECT PLANNING</span><h2 id="${headingId}">Temporary mobile kitchen trailer rental ${scope}</h2><p>Practical planning guidance for renovations, emergencies, seasonal demand, and temporary food-service continuity.</p></div>
    <div class="json-local-copy">
      <p>A temporary kitchen is most effective when it is planned as part of the operating site, not treated as a stand-alone trailer. For projects ${scope}, the first conversation should cover the menu, daily meal volume, service schedule, staffing pattern, and the length of the interruption. Those details help identify whether the operation needs a complete mobile kitchen, added cold storage, a dishwashing trailer, or a coordinated group of units. They also provide a useful basis for discussing equipment, prep space, dry storage, and the flow from receiving through cooking, service, and warewashing.</p>
      <p>Site conditions shape the rental plan. Before delivery, confirm the proposed placement area, approach route, turning space, ground conditions, overhead clearance, and the distance from the temporary facility to the building it supports. The project team should also identify available electrical service, potable-water connections, wastewater handling, fuel requirements, ventilation clearances, and any local inspection steps. Photographs, utility information, and a simple site sketch can make the planning review more efficient. Final placement and connection requirements should always be confirmed for the selected unit and the specific property.</p>
      <p>Different projects call for different operating strategies. A renovation may need phased capacity that changes as permanent rooms reopen. An emergency response may prioritize speed, dependable meal output, and a clear contingency plan. A school, healthcare facility, hotel, correctional facility, event venue, or institutional campus may have its own receiving windows, security procedures, dietary requirements, and traffic restrictions. Sharing those constraints early helps the rental team recommend a practical configuration instead of relying on a generic package.</p>
      <p>Delivery timing and pricing depend on the selected equipment, rental duration, origin of the available unit, and job-site readiness. Starting estimates are useful for comparison, but they are not a final quote. Ask for a written scope that separates rental charges from transportation, setup, utility work, site preparation, permits, cleaning responsibilities, and optional support equipment. If the project schedule may shift, discuss extensions and off-rent procedures before the unit is dispatched. That preparation reduces surprises and keeps responsibility clear between the renter, property team, contractors, and service providers.</p>
      <p>Regional planning can also benefit from comparing nearby service areas. A multi-site organization may need consistent specifications at several properties, while a contractor may be coordinating consecutive projects in neighboring markets. The location pages below provide a starting point for city-level planning. They do not promise that a particular trailer is stored in that city or immediately available; inventory, delivery timing, and transport details must be confirmed for each request.</p>
    </div>
    <div class="json-local-links"><h3>Related city service-area planning</h3><ul>${cityLinks}</ul><p class="json-note">Call <a href="tel:+18336347812">(833) 634-7812</a> with the project address, dates, meal volume, and utility details to confirm the appropriate temporary kitchen plan.</p></div>
  </div></section>`;
};

const cityHero = (record, index, stateSlug) => {
  const page = record.page_layout_data;
  const variation = (index % 2) + 1;
  const crumbs = breadcrumb([
    { label: page.breadcrumb_labels[0], href: '/' },
    { label: page.breadcrumb_labels[1], href: '/service-areas/' },
    { label: page.breadcrumb_labels[2], href: `/service-areas/${stateSlug}/` },
    { label: page.breadcrumb_labels[3] },
  ]);
  return `<section class="json-location-hero json-location-hero--v${variation}" data-hero-variation="${variation}"><div class="wrap section">${crumbs}
    <div class="json-city-hero-grid"><div class="json-city-hero-copy"><span class="json-availability">${esc(page.availability_label)}</span><h1>${esc(page.h1)}</h1><p>${esc(page.description)}</p><div class="json-hero-actions">${PHONE_LINK}<a class="model-call" href="/contact-us/">${esc('Plan kitchen capacity around each renovation phase')}</a></div></div>
    <figure class="json-city-hero-visual"><img src="${HERO_IMAGE}" width="1600" height="1067" alt="Commercial mobile kitchen cooking line prepared for temporary food-service operations" loading="eager" fetchpriority="high"><figcaption>${esc(page.inventory_family)}</figcaption></figure>
    <aside class="json-hero-facts" aria-label="Location rental planning details"><article><span>Starting price</span><strong>${money(page.starting_price)}</strong><small>${esc(page.starting_price_basis)}</small></article><article><span>Delivery planning range</span><strong>${esc(page.delivery_time_range.display)}</strong><small>${esc(page.estimated_delivery_display)}</small></article><article><span>Planning distance</span><strong>${esc(page.delivery_distance.display)}</strong><small>${esc(page.delivery_distance.basis)}</small></article><article><span>Service hours</span><strong>${esc(page.service_hours)}</strong><small>${esc(record.availability_note)}</small></article></aside></div>
  </div></section>`;
};

const cityMain = (record, index, site, cityLookup, stateCities) => {
  const page = record.page_layout_data;
  const stateSlug = slugify(record.state);
  const articles = page.related_incident_articles ?? [];
  const nearbyRecords = nearbyRecordsForCity(record, cityLookup, stateCities);
  const rental = page.rental_information;
  return `<main id="main" tabindex="-1" class="json-location-page json-city-page">${cityHero(record, index, stateSlug)}
    <section class="json-section json-pricing" aria-labelledby="pricing-heading"><div class="wrap section"><span class="eyebrow">CITY-SPECIFIC PRICING</span><h2 id="pricing-heading">Kitchen and refrigerator starting estimates</h2><p>Kitchen pricing includes the JSON-provided ${record.city_discount_percent}% city adjustment. Refrigerator pricing remains site-wide and does not receive the city ETA discount.</p>${priceCards(record, site)}</div></section>
    ${localPlanningSection({ location: `${record.representative_city}, ${record.state}`, nearbyRecords })}
    ${inventoryModule(site)}${processModule(site)}${operationsModule(site)}
    <section class="json-section json-rental-info" aria-labelledby="rental-heading"><div class="wrap section"><span class="eyebrow">RENTAL INFORMATION</span><h2 id="rental-heading">Delivery, setup, extensions, and terms</h2><div class="json-module-grid"><article><h3>Rental and delivery</h3><p>${esc(rental.minimum_rental)}</p><p>${esc(rental.delivery_fee)}.</p><p>${esc(rental.setup)}.</p></article><article><h3>Changes during the project</h3><p>${esc(rental.extensions)}.</p><p>${esc(rental.long_term_rental)}.</p><p>${esc(site.service_profile.rental_options.relocation_policy)}</p></article></div></div></section>
    ${articles.length ? `<section class="json-section json-article" aria-labelledby="article-heading"><div class="wrap section"><span class="eyebrow">LOCAL CONTEXT</span><h2 id="article-heading">Assigned city incident reference</h2>${articles.map((article) => `<article><h3><a href="${esc(article.source_url)}" rel="noopener noreferrer">${esc(article.title)}</a></h3><p><time datetime="${esc(article.date)}">${esc(article.date)}</time></p></article>`).join('')}</div></section>` : ''}
    ${faqModule(site)}
    <section class="json-location-cta"><div class="wrap section"><span class="eyebrow">PROJECT-SPECIFIC AVAILABILITY</span><h2>${esc(site.company_profile.primary_cta)}</h2><p>${esc(record.availability_note)}</p><div class="json-hero-actions">${PHONE_LINK}<a class="button button-secondary" href="/contact-us/">Request availability</a></div></div></section>
  </main>`;
};

const stateMain = (statePage, cities, site, index, cityLookup) => {
  const stateSlug = slugify(statePage.state);
  const variation = (index % 2) + 1;
  return `<main id="main" tabindex="-1" class="json-location-page json-state-page"><section class="json-state-hero json-state-hero--v${variation}" data-hero-variation="${variation}"><div class="wrap section">${breadcrumb([{ label: 'Home', href: '/' }, { label: 'Service Area Pages', href: '/service-areas/' }, { label: statePage.state }])}<div class="json-state-hero-grid"><div class="json-state-hero-copy"><span class="json-availability">Available by request</span><h1>${esc(statePage.h1)}</h1><p>${esc(statePage.description)}</p><div class="json-hero-actions">${PHONE_LINK}<a class="model-call" href="/contact-us/">Request availability</a></div></div><figure class="json-city-hero-visual"><img src="${HERO_IMAGE}" width="1600" height="1067" alt="Commercial mobile kitchen cooking line prepared for temporary food-service operations" loading="eager" fetchpriority="high"></figure><div class="json-state-facts"><article><span>Starting price</span><strong>${money(statePage.starting_price)}</strong><small>20 ft site-wide kitchen starting estimate before city adjustments</small></article><article><span>Cities served</span><strong>${cities.length}</strong><small>City-specific pricing and delivery planning pages</small></article></div></div></div></section>
    <section class="json-section json-state-cities" aria-labelledby="cities-heading"><div class="wrap section"><span class="eyebrow">CITY SERVICE AREAS</span><h2 id="cities-heading">Mobile kitchen trailer rental across ${esc(statePage.state)}</h2><p>${esc(site.service_profile.service_description)}</p><div class="json-city-card-grid">${cities.map((city) => `<a href="/service-areas/${stateSlug}/${city.page_layout_data.slug}/"><span>${esc(city.page_layout_data.availability_label)}</span><strong>${esc(city.representative_city)}, ${esc(city.state)}</strong><small>From ${money(city.page_layout_data.starting_price)} · ${esc(city.page_layout_data.delivery_time_range.display)}</small></a>`).join('')}</div></div></section>
    ${localPlanningSection({ location: statePage.state, nearbyRecords: nearbyRecordsForState(statePage.state, cities, cityLookup), isState: true })}
    ${inventoryModule(site)}${processModule(site)}${faqModule(site)}
    <section class="json-location-cta"><div class="wrap section"><h2>${esc(site.company_profile.primary_cta)}</h2><p>${esc(site.service_profile.delivery.availability_fallback)}</p><div class="json-hero-actions">${PHONE_LINK}<a class="button button-secondary" href="/contact-us/">Build a location-specific rental plan</a></div></div></section>
  </main>`;
};

export async function buildJsonLocationPages({ root, dist }) {
  const site = JSON.parse(await readFile(join(root, 'data', 'site-39.json'), 'utf8'));
  const cityLookup = new Map(site.service_area_data.map((record) => [`${record.representative_city}, ${record.state}`.toLowerCase(), record]));
  const stateGroups = new Map();
  site.service_area_data.forEach((record) => {
    const list = stateGroups.get(record.state) ?? [];
    list.push(record);
    stateGroups.set(record.state, list);
  });

  const basePath = join(dist, 'service-areas', 'alabama', 'index.html');
  const baseHtml = await readFile(basePath, 'utf8');

  for (const [index, statePage] of site.location_data.state_pages.entries()) {
    const stateSlug = slugify(statePage.state);
    const cities = stateGroups.get(statePage.state) ?? [];
    const route = `/service-areas/${stateSlug}/`;
    let html = baseHtml.replace(/<main id="main"[\s\S]*?<\/main>/i, stateMain(statePage, cities, site, index, cityLookup));
    html = replaceHead(html, { title: statePage.page_title, description: statePage.description, canonical: route });
    const directory = join(dist, 'service-areas', stateSlug);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'index.html'), html);
  }

  for (const [index, record] of site.service_area_data.entries()) {
    const stateSlug = slugify(record.state);
    const page = record.page_layout_data;
    const route = `/service-areas/${stateSlug}/${page.slug}/`;
    let html = baseHtml.replace(/<main id="main"[\s\S]*?<\/main>/i, cityMain(record, index, site, cityLookup, stateGroups.get(record.state) ?? []));
    html = replaceHead(html, { title: page.title, description: page.description, canonical: route });
    const directory = join(dist, 'service-areas', stateSlug, page.slug);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, 'index.html'), html);
  }

  const sitemapPath = join(dist, 'sitemap.xml');
  let sitemap = await readFile(sitemapPath, 'utf8');
  const locationRoutes = [
    ...site.location_data.state_pages.map((state) => `/service-areas/${slugify(state.state)}/`),
    ...site.service_area_data.map((record) => `/service-areas/${slugify(record.state)}/${record.page_layout_data.slug}/`),
  ];
  const additions = locationRoutes
    .filter((route) => !sitemap.includes(`${SITE_ORIGIN}${route}</loc>`))
    .map((route) => `<url><loc>${SITE_ORIGIN}${route}</loc></url>`)
    .join('');
  sitemap = sitemap.replace('</urlset>', `${additions}</urlset>`);
  await writeFile(sitemapPath, sitemap);

  return { site, stateGroups };
}
