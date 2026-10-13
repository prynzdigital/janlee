// Static site generator for Interiors by JanLee.  Usage: node build/build.mjs  -> writes ./site
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, categories, projectMeta, featured, services, process as steps, faqs, badges } from './content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'site-data.json'), 'utf8'));
const YEAR = new Date().getFullYear();
// content hashes bust browser caches whenever CSS/JS change
import crypto from 'node:crypto';
const ver = f => crypto.createHash('md5').update(fs.readFileSync(path.join(OUT, f))).digest('hex').slice(0, 8);
const CSS_V = ver('assets/css/styles.css'), JS_V = ver('assets/js/main.js');
const YEARS = YEAR - site.founded;

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const paras = s => s.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const houzzSlug = s => s.toLowerCase().replace(/'/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const catLabel = id => categories.find(c => c.id === id)?.label ?? '';

const projects = data.projects.map(p => {
  const m = projectMeta[p.id] || {};
  if (m.cover) { p.photos = [p.photos[m.cover], ...p.photos.filter((_, i) => i !== m.cover)]; delete p.coverLg; }
  return { ...p, ...m, description: (p.description || m.description || '').trim(), url: `/projects/${p.id}-${houzzSlug(p.name)}/` };
});
const bySlug = Object.fromEntries(projects.map(p => [p.slug, p]));
const byId = Object.fromEntries(projects.map(p => [p.id, p]));
const reviews = data.reviews;
const totalPhotos = projects.reduce((n, p) => n + p.photos.length, 0);

const imgBase = (p, ph) => `/assets/img/projects/${p.slug}/${ph.name}`;
function img(p, i = 0, { sizes = '(min-width: 1024px) 33vw, 100vw', cls = '', eager = false, alt } = {}) {
  const ph = p.photos[i] || p.photos[0];
  const b = imgBase(p, ph);
  const a = alt ?? `${p.name} — interior design by Interiors by JanLee, Colorado Springs`;
  return `<img class="${cls}" src="${b}-sm.webp" srcset="${b}-sm.webp ${ph.tw}w, ${b}.webp ${ph.w}w" sizes="${sizes}" width="${ph.tw}" height="${ph.th}" alt="${esc(a)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
const svcImg = (s, opts) => img(bySlug[s.img[0]], s.img[1], opts);

const I = {
  sofa: '<path d="M4 18v-6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2h16v-2a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M7 10V8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2M7 20v2M25 20v2"/>',
  kitchen: '<rect x="5" y="4" width="22" height="24" rx="1.5"/><path d="M5 12h22M10 8h2M16 8h2M9 17h14v7H9z"/>',
  bath: '<path d="M4 16h24v3a7 7 0 0 1-7 7H11a7 7 0 0 1-7-7v-3ZM8 16V7a3 3 0 0 1 6 0M9 26l-1 2M23 26l1 2"/>',
  plan: '<rect x="4" y="4" width="24" height="24" rx="1"/><path d="M4 14h9v14M13 4v6M19 14h9M19 14v6M19 24v4"/>',
  palette: '<path d="M16 4a12 12 0 1 0 0 24c1.7 0 2.5-1.2 2.5-2.5 0-1.8-1.5-2.3-1.5-3.8 0-1.2 1-2.2 2.2-2.2H22a6 6 0 0 0 6-6C28 8.6 22.6 4 16 4Z"/><circle cx="10" cy="14" r="1.6"/><circle cx="14" cy="9" r="1.6"/><circle cx="20" cy="9" r="1.6"/>',
  chair: '<path d="M9 4h14v10H9zM7 14h18v4H7zM9 18v10M23 18v10M9 24h14"/>',
  store: '<path d="M4 12 6 5h20l2 7M4 12a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M6 15v13h20V15M13 28v-7h6v7"/>',
  arrow: '<path d="M5 16h22M19 8l8 8-8 8"/>',
  arrowL: '<path d="M27 16H5M13 8l-8 8 8 8"/>',
  phone: '<path d="M8 4h4l2 6-3 2a15 15 0 0 0 9 9l2-3 6 2v4a3 3 0 0 1-3 3A23 23 0 0 1 5 7a3 3 0 0 1 3-3Z"/>',
  mail: '<rect x="4" y="7" width="24" height="18" rx="2"/><path d="m4 9 12 8 12-8"/>',
  pin: '<path d="M16 29s9-8.4 9-15a9 9 0 0 0-18 0c0 6.6 9 15 9 15Z"/><circle cx="16" cy="14" r="3.2"/>',
  check: '<circle cx="16" cy="16" r="12"/><path d="m11 16 3.5 3.5L21 13"/>',
  award: '<circle cx="16" cy="12" r="8"/><path d="m11 18-3 10 8-4 8 4-3-10"/><path d="m16 8 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z"/>',
  home: '<path d="M4 15 16 5l12 10M7 13v14h18V13M13 27v-8h6v8"/>',
  heart: '<path d="M16 27S4 20 4 11.5A6.5 6.5 0 0 1 16 8a6.5 6.5 0 0 1 12 3.5C28 20 16 27 16 27Z"/>',
  calendar: '<rect x="4" y="6" width="24" height="22" rx="2"/><path d="M4 12h24M10 3v6M22 3v6"/>',
  camera: '<path d="M4 10h5l2-3h10l2 3h5v17H4z"/><circle cx="16" cy="18" r="5"/>',
  menu: '<path d="M4 9h24M4 16h24M4 23h24"/>',
  close: '<path d="m7 7 18 18M25 7 7 25"/>',
  grid: '<rect x="4" y="4" width="10" height="10"/><rect x="18" y="4" width="10" height="10"/><rect x="4" y="18" width="10" height="10"/><rect x="18" y="18" width="10" height="10"/>',
};
const icon = (n, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
const stars = (n = 5) => `<span class="stars" role="img" aria-label="${n} out of 5 stars">${'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 1.5 2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 15l-5.4 3 1.2-6L1.3 7.8l6.1-.7z"/></svg>'.repeat(n)}</span>`;
const logoMark = `<svg class="logo-mark" viewBox="0 0 44 52" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 50V22a18 18 0 0 1 36 0v28"/><path d="M12 50V23a10 10 0 0 1 20 0v27"/><path d="M1 50h42"/><path d="M22 6v-4"/></svg>`;
const logo = (extra = '') => `<a class="logo ${extra}" href="/" aria-label="Interiors by JanLee — home">${logoMark}<span class="logo-text"><span class="logo-name">JanLee</span><span class="logo-sub">Interiors by</span></span></a>`;

const nav = [['/', 'Home'], ['/about/', 'About'], ['/services/', 'Services'], ['/our-work/', 'Our Work'], ['/testimonials/', 'Testimonials'], ['/contact/', 'Contact']];

const ldBusiness = {
  '@context': 'https://schema.org', '@type': 'HomeAndConstructionBusiness', '@id': site.url + '/#business',
  name: site.name, alternateName: 'Interiors By Janlee', url: site.url + '/',
  logo: site.url + '/assets/img/brand/logo.png', image: site.url + '/assets/img/og/home.jpg',
  description: 'Full-service interior design and remodeling firm in Colorado Springs, CO, established in 2011. Interior design, kitchen and bathroom renovations, home remodeling, color consultations and furniture repurposing.',
  telephone: '+1-719-930-5245', email: site.email, foundingDate: String(site.founded), priceRange: '$$',
  address: { '@type': 'PostalAddress', addressLocality: site.city, addressRegion: site.region, addressCountry: 'US' },
  geo: { '@type': 'GeoCoordinates', latitude: 38.8339, longitude: -104.8214 },
  areaServed: { '@type': 'City', name: 'Colorado Springs' },
  award: badges.map(y => `Best of Houzz ${y} — Client Satisfaction`),
  knowsAbout: ['Interior design', 'Kitchen remodeling', 'Bathroom remodeling', 'Home renovation', 'Color consultation', 'Furniture repurposing', 'Space planning'],
  hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Interior design services', itemListElement: services.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title } })) },
};
const breadcrumb = items => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([url, name], i) => ({ '@type': 'ListItem', position: i + 1, name, item: site.url + url })) });

function layout({ title, description, url, body, ogImage = '/assets/img/og/home.jpg', ld = [], preload = '', bodyClass = '' }) {
  const full = site.url + url;
  const navHtml = nav.map(([h, t]) => `<li><a href="${h}"${h === url || (h !== '/' && url.startsWith(h)) || (h === '/our-work/' && url.startsWith('/projects/')) ? ' aria-current="page"' : ''}>${t}</a></li>`).join('');
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${full}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#F7F2EA">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${full}">
<meta property="og:image" content="${site.url}${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${site.url}${ogImage}">
<meta name="geo.region" content="US-CO">
<meta name="geo.placename" content="Colorado Springs">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" type="image/png" sizes="96x96">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Jost:wght@400;500;600&display=swap">
${preload}<link rel="stylesheet" href="/assets/css/styles.css?v=${CSS_V}">
${[ldBusiness, ...ld].map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body class="${bodyClass}">
<a class="skip" href="#main">Skip to content</a>
<div class="topbar"><div class="wrap topbar-in">
  <span>${icon('pin')} ${site.city}, ${site.region}</span>
  <a href="mailto:${site.email}">${icon('mail')} ${site.email}</a>
  <a href="${site.phoneHref}">${icon('phone')} ${site.phone}</a>
  <span class="topbar-award">${icon('award')} Best of Houzz · Client Satisfaction 2015–2024</span>
</div></div>
<header class="header" id="top"><div class="wrap header-in">
  ${logo()}
  <nav class="nav" id="nav" aria-label="Main">
    <ul>${navHtml}</ul>
    <a class="btn btn-dark nav-cta-mobile" href="/contact/">Book a Consultation</a>
    <p class="nav-contact"><a href="${site.phoneHref}">${site.phone}</a><a href="mailto:${site.email}">${site.email}</a></p>
  </nav>
  <a class="btn btn-dark header-cta" href="/contact/">Book a Consultation</a>
  <a class="icon-btn header-call" href="${site.phoneHref}" aria-label="Call ${site.phone}">${icon('phone')}</a>
  <button class="icon-btn menu-btn" aria-controls="nav" aria-expanded="false" aria-label="Open menu">${icon('menu', 'ic i-open')}${icon('close', 'ic i-close')}</button>
</div></header>
<main id="main">
${body}
</main>
${footer()}
<div class="mobile-bar" aria-label="Quick contact">
  <a href="${site.phoneHref}">${icon('phone')} Call</a>
  <a href="/contact/" class="mobile-bar-primary">${icon('calendar')} Book a Consultation</a>
</div>
<script src="/assets/js/main.js?v=${JS_V}" defer></script>
</body>
</html>
`;
}

function footer() {
  return `<footer class="footer"><div class="wrap">
  <div class="footer-grid">
    <div class="footer-brand">
      ${logo('logo-light')}
      <p>Creating uniquely beautiful, functional and personal homes in Colorado Springs since ${site.founded}. Restoring the old while embracing the new.</p>
      <div class="footer-badges">${badges.slice(0, 4).map(y => `<img src="/assets/img/badges/best-of-houzz-${y}.png" width="56" height="56" alt="Best of Houzz ${y} — Client Satisfaction" loading="lazy">`).join('')}</div>
    </div>
    <div><h2 class="footer-h">Explore</h2><ul class="footer-links">${nav.map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>
    <div><h2 class="footer-h">Services</h2><ul class="footer-links">${services.map(s => `<li><a href="/services/#${s.id}">${s.title}</a></li>`).join('')}</ul></div>
    <div><h2 class="footer-h">Contact</h2>
      <ul class="footer-contact">
        <li>${icon('pin')}<span>${site.city}, Colorado</span></li>
        <li>${icon('phone')}<a href="${site.phoneHref}">${site.phone}</a></li>
        <li>${icon('mail')}<a href="mailto:${site.email}">${site.email}</a></li>
      </ul>
      <a class="link-arrow link-gold" href="/contact/">Book a Consultation ${icon('arrow')}</a>
    </div>
  </div>
  <div class="footer-bottom"><p>© ${YEAR} Interiors by JanLee. All rights reserved.</p><p><a href="/privacy/">Privacy Policy</a></p></div>
</div></footer>`;
}

const sectionHead = (eyebrow, title, extra = '', tag = 'h2') => `<p class="eyebrow">${eyebrow}</p><${tag} class="h2">${title}</${tag}>${extra}`;

function projectCard(p, { sizes = '(min-width: 1100px) 25vw, (min-width: 640px) 45vw, 85vw', h = 'h3' } = {}) {
  return `<article class="card" data-cat="${p.cat}">
  <a class="card-link" href="${p.url}">
    <div class="card-media">${img(p, 0, { sizes })}<span class="chip">${esc(catLabel(p.cat))}</span></div>
    <div class="card-body"><${h} class="card-title">${esc(p.name)}</${h}><p class="card-meta">${icon('pin')} ${site.city}, ${site.region} <span aria-hidden="true">·</span> ${p.photos.length} photos</p></div>
  </a></article>`;
}

function reviewCard(r, { clamp = true } = {}) {
  const long = r.body.length > 420;
  return `<figure class="review${clamp && long ? ' is-clamped' : ''}">
  <div class="review-top"><span class="q" aria-hidden="true">“</span>${stars(r.rating)}</div>
  <blockquote class="review-body">${paras(r.body)}</blockquote>
  ${clamp && long ? '<button class="review-more" type="button" aria-expanded="false">Read more</button>' : ''}
  <figcaption><span class="avatar" aria-hidden="true">${esc(r.name.split(/\s+/).map(w => w[0]).slice(0, 2).join(''))}</span><span><strong>${esc(r.name)}</strong><small>Houzz review${r.date ? ' · ' + r.date.slice(0, 4) : ''}</small></span></figcaption>
</figure>`;
}

const ctaBand = (title = 'Reinvigorate Your Home Today', text = 'Let’s create a space that feels beautifully, unmistakably yours. Schedule a design consultation with JanLee.') => {
  const p = bySlug['warm-and-inviting-living'];
  return `<section class="cta-band">
  <div class="cta-bg">${img(p, 0, { sizes: '100vw', alt: '' })}</div>
  <div class="wrap cta-in reveal">
    <p class="eyebrow eyebrow-light">Start your project</p>
    <h2 class="h2">${title}</h2>
    <p>${text}</p>
    <div class="btn-row"><a class="btn btn-gold" href="/contact/">Book a Consultation ${icon('arrow')}</a><a class="btn btn-ghost-light" href="${site.phoneHref}">${icon('phone')} ${site.phone}</a></div>
  </div></section>`;
};

// Decorative banner photo: small file on phones, large cover on tablet/desktop
function heroBg(slug, i = 0) {
  if (!slug) return '';
  const p = bySlug[slug], ph = p.photos[i], b = `/assets/img/projects/${p.slug}`;
  const lg = i === 0 && p.coverLg ? `${b}/cover-lg.webp ${p.coverLg[0]}w, ` : '';
  return `<picture class="page-hero-bg"><source media="(min-width: 768px)" srcset="${lg}${b}/${ph.name}.webp ${ph.w}w" sizes="100vw"><img src="${b}/${ph.name}-sm.webp" width="${ph.tw}" height="${ph.th}" alt="" fetchpriority="high" decoding="async"></picture>`;
}
const pageHero = (eyebrow, title, text, crumbs, bg) => `<section class="page-hero${bg ? ' has-bg' : ''}">${heroBg(bg)}<div class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map(([u, n], i) => i === crumbs.length - 1 ? `<li aria-current="page">${n}</li>` : `<li><a href="${u}">${n}</a></li>`).join('')}</ol></nav>
  <p class="eyebrow">${eyebrow}</p><h1 class="h1">${title}</h1>${text ? `<p class="lead">${text}</p>` : ''}
</div></section>`;

// Photo pinned to the viewport behind the stats band; the page scrolls over it (see .stats-bg in CSS)
function statsBg(slug = 'in-home-bar') {
  const p = bySlug[slug], ph = p.photos[0], b = `/assets/img/projects/${p.slug}`;
  const lg = p.coverLg ? `${b}/cover-lg.webp ${p.coverLg[0]}w, ` : '';
  return `<div class="stats-bg" aria-hidden="true"><picture><source media="(min-width: 768px)" srcset="${lg}${b}/${ph.name}.webp ${ph.w}w" sizes="100vw"><img src="${b}/${ph.name}.webp" width="${ph.w}" height="${ph.h}" alt="" loading="lazy" decoding="async"></picture></div>`;
}
const stats = () => `<section class="stats" aria-label="At a glance">${statsBg()}<div class="wrap stats-in">
  <div class="stat">${icon('calendar', 'ic stat-ic')}<p><strong>${YEARS}+</strong><span>Years of design</span></p></div>
  <div class="stat">${icon('award', 'ic stat-ic')}<p><strong>8×</strong><span>Best of Houzz winner</span></p></div>
  <div class="stat">${icon('heart', 'ic stat-ic')}<p><strong>${reviews.length}</strong><span>Five-star reviews</span></p></div>
  <div class="stat">${icon('camera', 'ic stat-ic')}<p><strong>${projects.length}</strong><span>Portfolio projects</span></p></div>
</div></section>`;

const badgeRow = () => `<section class="section awards"><div class="wrap">
  <div class="center reveal">${sectionHead('Recognition', 'Best of Houzz for Client Satisfaction', '<p class="lead">Awarded eight times by the Houzz community — a reflection of the trust and happiness of our clients.</p>')}</div>
  <ul class="badge-row reveal">${badges.map(y => `<li><img src="/assets/img/badges/best-of-houzz-${y}.png" width="80" height="80" alt="Best of Houzz ${y} — Client Satisfaction" loading="lazy"></li>`).join('')}</ul>
</div></section>`;

// ---------- pages ----------
const pages = {};

// HOME
{
  const hero = byId[7726641];
  const heroPh = hero.photos[0];
  const about = bySlug['calming-sophistication'];
  const bestFill = [2174704, 1992714, 1865471, 1928631, 1187657, 1424726, 1857109, 1188086].map(id => reviews.find(r => r.id === id)).filter(Boolean);
  const heroSrc = `/assets/img/projects/${hero.slug}`;
  // Hero slideshow: first slide loads immediately (LCP); the rest are hydrated by main.js after page load
  const heroSlides = [7726641, 7726680, 7333644, 7726671].map(id => byId[id]);
  const heroAlt = {
    7726641: 'Sage green kitchen with Taj Mahal quartzite island and woven pendant light, designed by Interiors by JanLee in Colorado Springs',
  };
  const heroSlide = (p, i) => {
    const ph = p.photos[0], b = `/assets/img/projects/${p.slug}`;
    const set = `${p.coverLg ? `${b}/cover-lg.webp ${p.coverLg[0]}w, ` : ''}${b}/${ph.name}.webp ${ph.w}w`;
    const a = (k, v) => i ? `data-${k}="${v}"` : `${k}="${v}"`;
    return `<figure class="hero-slide${i ? '' : ' is-active'}" data-name="${esc(p.name)}" data-url="${p.url}" data-meta="${esc(catLabel(p.cat))} · ${p.photos.length} photos"${i ? ' aria-hidden="true"' : ''}><picture><source media="(min-width: 768px)" ${a('srcset', set)} sizes="70vw"><img ${a('src', `${b}/${ph.name}-sm.webp`)} width="${ph.tw}" height="${ph.th}" alt="${esc(heroAlt[p.id] || `${p.name} — interior design by Interiors by JanLee, Colorado Springs`)}"${i ? '' : ' fetchpriority="high"'} decoding="async"></picture></figure>`;
  };
  const body = `
<section class="hero" data-hero>
  <div class="hero-media">
    <div class="hero-slides">${heroSlides.map((p, i) => heroSlide(p, i)).join('')}</div>
    <div class="hero-feature">
      <a class="hf-link" href="${heroSlides[0].url}">
        <span class="hf-label">Featured project</span>
        <span class="hf-name">${esc(heroSlides[0].name)}</span>
        <span class="hf-meta">${esc(catLabel(heroSlides[0].cat))} · ${heroSlides[0].photos.length} photos</span>
        ${icon('arrow', 'ic hf-arrow')}
      </a>
      <div class="hf-dots" role="group" aria-label="Choose featured project">${heroSlides.map((p, i) => `<button type="button" class="hf-dot${i ? '' : ' is-active'}" data-go="${i}" aria-label="Show ${esc(p.name)}"${i ? '' : ' aria-current="true"'}><i></i></button>`).join('')}</div>
    </div>
  </div>
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="hero-kicker">Colorado Springs Interior Design</p>
      <h1 class="hero-title"><span class="line"><span>Restoring the Old.</span></span> <span class="line"><span><em>Embracing</em> the New.</span></span></h1>
      <p class="hero-lead">Uniquely beautiful, livable homes designed around your story — from a single room refresh to a complete kitchen, bath or whole-home renovation.</p>
      <div class="btn-row">
        <a class="btn btn-dark" href="/our-work/">Explore Our Work ${icon('arrow')}</a>
        <a class="btn btn-outline" href="/contact/">Book a Consultation</a>
      </div>
      <div class="trust">
        <div class="trust-badges">${badges.slice(0, 3).map(y => `<img src="/assets/img/badges/best-of-houzz-${y}.png" width="44" height="44" alt="Best of Houzz ${y}">`).join('')}</div>
        <p>${stars()} <strong>5.0</strong> · ${reviews.length} reviews<br><span>8× Best of Houzz · Client Satisfaction</span></p>
      </div>
    </div>
  </div>
</section>

<section class="svc-strip" aria-label="Our services"><div class="wrap">
  <ul class="svc-cards">
    ${services.slice(0, 5).map(s => `<li class="reveal"><a href="/services/#${s.id}">${icon(s.icon, 'ic svc-ic')}<h2 class="svc-title">${s.title}</h2><p>${s.short}</p></a></li>`).join('')}
  </ul>
</div></section>

<section class="section about-split"><div class="wrap split">
  <div class="split-media collage">
    <a class="col-tile col-a" href="${about.url}">${img(about, 1, { sizes: '(min-width: 1024px) 26vw, 55vw' })}<span class="col-cap">${esc(about.name)}</span></a>
    <a class="col-tile col-b" href="${byId[7333643].url}">${img(byId[7333643], 0, { sizes: '(min-width: 1024px) 20vw, 42vw' })}<span class="col-cap">${esc(byId[7333643].name)}</span></a>
    <a class="col-tile col-c" href="${byId[7726658].url}">${img(byId[7726658], 0, { sizes: '(min-width: 1024px) 20vw, 42vw' })}<span class="col-cap">${esc(byId[7726658].name)}</span></a>
    <div class="since"><span>Est.</span><strong>${site.founded}</strong><span>Designing Colorado homes</span></div>
  </div>
  <div class="split-copy reveal">
    ${sectionHead('About JanLee', 'Designing More Than Spaces — We Create Homes That Feel Like You.')}
    <p>Interiors by JanLee is a full-service design and remodeling company dedicated to creating beautiful, functional and personalized homes at every stage of the renovation process. Restoring the old while embracing the new is our passion — with a love for mixing colors, styles and patterns to create something stunning.</p>
    <ul class="checks">
      ${['Personalized design plans', 'Full contractor coordination', 'Color & material consultations', 'Furniture selection & repurposing', 'On time & on budget', 'Classic meets contemporary'].map(t => `<li>${icon('check')}${t}</li>`).join('')}
    </ul>
    <a class="btn btn-dark" href="/about/">Learn More About Us ${icon('arrow')}</a>
  </div>
</div></section>

<section class="section section-tint"><div class="wrap">
  <div class="section-head reveal">
    <div>${sectionHead('Our Projects', 'Spaces We’re Proud Of')}</div>
    <a class="link-arrow" href="/our-work/">View all ${projects.length} projects ${icon('arrow')}</a>
  </div>
  <div class="card-rail reveal">${featured.map(id => projectCard(byId[id])).join('')}</div>
</div></section>

${stats()}

<section class="section"><div class="wrap">
  <div class="center reveal">${sectionHead('How We Work', 'A Seamless, Personal Process', '<p class="lead">Every successful project begins with listening. From the first conversation to the final reveal, we guide every decision with confidence.</p>')}</div>
  <ol class="steps">${steps.map((s, i) => `<li class="step reveal"><span class="step-n">0${i + 1}</span><h3>${s.title}</h3><p>${s.body}</p></li>`).join('')}</ol>
</div></section>

<section class="section section-tint testimonials"><div class="wrap">
  <div class="section-head reveal">
    <div>${sectionHead('What Our Clients Say', 'Trusted by Colorado Springs Homeowners')}</div>
    <div class="rail-ctrl"><button class="icon-btn round" data-rail-prev aria-label="Previous reviews">${icon('arrowL')}</button><button class="icon-btn round" data-rail-next aria-label="Next reviews">${icon('arrow')}</button></div>
  </div>
  <div class="review-rail" data-rail>${bestFill.map(r => reviewCard(r)).join('')}</div>
  <p class="center more-link"><a class="link-arrow" href="/testimonials/">Read all ${reviews.length} reviews ${icon('arrow')}</a></p>
</div></section>

${badgeRow()}
${ctaBand()}`;
  pages['/'] = layout({
    title: 'Interiors by JanLee | Interior Designer & Remodeling in Colorado Springs, CO',
    description: `Award-winning Colorado Springs interior design & remodeling since ${site.founded}. Kitchens, bathrooms, whole-home renovations, color & furniture. 8× Best of Houzz. Call ${site.phone}.`,
    url: '/', body, bodyClass: 'home',
    preload: `<link rel="preload" as="image" href="${heroSrc}/${heroPh.name}-sm.webp" media="(max-width: 767px)" fetchpriority="high">\n<link rel="preload" as="image" imagesrcset="${heroSrc}/cover-lg.webp 1600w, ${heroSrc}/${heroPh.name}.webp 1280w" imagesizes="70vw" media="(min-width: 768px)" fetchpriority="high">\n`,
    ld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, url: site.url + '/' }],
  });
}

// ABOUT
{
  const a = bySlug['calming-sophistication'], b = bySlug['stunning-statements'];
  const body = `
${pageHero('About Us', 'Our World-Class Team in Colorado Springs', `Since ${site.founded}, Interiors by JanLee has partnered with homeowners to transform existing spaces through thoughtful design, remodeling and custom renovation.`, [['/', 'Home'], ['/about/', 'About']], 'kissing-camels-chalet')}
<section class="section"><div class="wrap split">
  <div class="split-media reveal">${img(a, 1, { sizes: '(min-width: 1024px) 45vw, 100vw', cls: 'split-img' })}</div>
  <div class="split-copy prose reveal">
    <p class="eyebrow">Our Story</p>
    <h2 class="h2">Uniquely Beautiful Living Spaces</h2>
    <p>Interiors by JanLee was established in ${site.founded}. Our company is about creating uniquely beautiful living spaces through consulting, decorating and remodeling. Whether it looks like redesigning a broken-down piece of furniture, renovating a living space, or finding that perfect new piece — restoring the old while embracing the new is my passion.</p>
    <p>I have a love for mixing colors, styles and patterns to create something stunning. Our passion is blending classic and contemporary elements while preserving the character of your home.</p>
  </div>
</div></section>
<section class="section section-tint"><div class="wrap split split-rev">
  <div class="split-media reveal">${img(b, 0, { sizes: '(min-width: 1024px) 45vw, 100vw', cls: 'split-img' })}</div>
  <div class="split-copy prose reveal">
    <p class="eyebrow">Full-Service Design</p>
    <h2 class="h2">From First Consultation to Final Reveal</h2>
    <p>Interiors by JanLee is a full-service design and remodeling company dedicated to creating beautiful, functional and personalized homes throughout every stage of the renovation process.</p>
    <p>From the initial design consultation to material selections, project planning and construction coordination, we provide a collaborative, hands-on approach that makes remodeling seamless and enjoyable. Whether you’re updating a single room, remodeling a kitchen or bathroom, renovating your entire home, or refreshing your interiors with custom furnishings, lighting, flooring, cabinetry, paint colors and décor, we deliver timeless designs with exceptional attention to detail.</p>
    <p>We specialize in interior renovations, custom finishes, furniture selection, color consultations, space optimization and complete home transformations that increase both beauty and functionality.</p>
  </div>
</div></section>
<section class="section"><div class="wrap narrow center reveal">
  <p class="eyebrow">Our Philosophy</p>
  <p class="pull">“Every successful project begins with <em>listening</em>.”</p>
  <p class="lead">We take the time to understand your goals, develop a personalized design plan, and guide you through every decision with confidence. The result is a thoughtfully designed home that is beautiful, comfortable and built to enhance the way you live.</p>
</div></section>
${stats()}
<section class="section"><div class="wrap">
  <div class="center reveal">${sectionHead('How We Work', 'Our Design Process')}</div>
  <ol class="steps">${steps.map((s, i) => `<li class="step reveal"><span class="step-n">0${i + 1}</span><h3>${s.title}</h3><p>${s.body}</p></li>`).join('')}</ol>
</div></section>
${badgeRow()}
<section class="section section-tint"><div class="wrap">
  <div class="section-head reveal"><div>${sectionHead('Client Testimonials', 'Kind Words From Our Clients')}</div><a class="link-arrow" href="/testimonials/">All reviews ${icon('arrow')}</a></div>
  <div class="review-grid">${[1989221, 1857172, 1188086].map(id => reviews.find(r => r.id === id)).filter(Boolean).map(r => reviewCard(r)).join('')}</div>
</div></section>
${ctaBand('Turn Your House into Your Dream Home')}`;
  pages['/about/'] = layout({
    title: 'About JanLee | Colorado Springs Interior Design Firm Since 2011',
    description: 'Meet Interiors by JanLee — a full-service Colorado Springs design and remodeling firm since 2011, blending classic and contemporary while preserving your home’s character.',
    url: '/about/', body, ogImage: `/assets/img/og/${a.slug}.jpg`, ld: [breadcrumb([['/', 'Home'], ['/about/', 'About']])],
  });
}

// SERVICES
{
  const body = `
${pageHero('Services', 'Interior Design & Remodeling Services', 'Personalized design, renovation and decorating for homes and businesses across Colorado Springs.', [['/', 'Home'], ['/services/', 'Services']], 'timeless-open-navy-blue-kitchen')}
<nav class="wrap svc-jump" aria-label="Services on this page"><ul>${services.map(s => `<li><a href="#${s.id}">${icon(s.icon)}${s.title}</a></li>`).join('')}</ul></nav>
${services.map((s, i) => `<section class="section ${i % 2 ? 'section-tint' : ''}" id="${s.id}"><div class="wrap split ${i % 2 ? 'split-rev' : ''}">
  <div class="split-media reveal">${svcImg(s, { sizes: '(min-width: 1024px) 45vw, 100vw', cls: 'split-img' })}</div>
  <div class="split-copy prose reveal">
    ${icon(s.icon, 'ic svc-ic')}
    <h2 class="h2">${s.title}</h2>
    <p class="lead-sm">${s.short}</p>
    <p>${s.body}</p>
    <a class="link-arrow" href="/contact/">Discuss your project ${icon('arrow')}</a>
  </div>
</div></section>`).join('')}
<section class="section"><div class="wrap narrow">
  <div class="center reveal">${sectionHead('FAQ', 'Frequently Asked Questions')}</div>
  <div class="faq reveal">${faqs.map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('')}</div>
</div></section>
${ctaBand()}`;
  pages['/services/'] = layout({
    title: 'Interior Design, Kitchen & Bath Remodeling Services | Colorado Springs',
    description: 'Interior design & decorating, kitchen and bathroom renovations, home remodeling, color consultations, furniture repurposing and commercial design in Colorado Springs, CO.',
    url: '/services/', body, ogImage: '/assets/img/og/calming-earthy-sage-green-kitchen.jpg',
    ld: [breadcrumb([['/', 'Home'], ['/services/', 'Services']]),
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }],
  });
}

// OUR WORK
{
  const counts = Object.fromEntries(categories.map(c => [c.id, projects.filter(p => p.cat === c.id).length]));
  const body = `
${pageHero('Portfolio', 'Our Work', `${projects.length} projects and ${Math.floor(totalPhotos / 100) * 100}+ photographs of kitchens, baths, bedrooms, whole-home makeovers and commercial spaces across Colorado Springs.`, [['/', 'Home'], ['/our-work/', 'Our Work']], 'simply-outside-the-box')}
<section class="section section-top0"><div class="wrap">
  <div class="filters" role="toolbar" aria-label="Filter projects">
    <button type="button" class="filter" aria-pressed="true" data-filter="all">All <span>${projects.length}</span></button>
    ${categories.map(c => `<button type="button" class="filter" aria-pressed="false" data-filter="${c.id}">${c.label} <span>${counts[c.id]}</span></button>`).join('')}
  </div>
  <div class="card-grid" data-grid>${projects.map(p => projectCard(p, { sizes: '(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw', h: 'h2' })).join('')}</div>
</div></section>
${ctaBand('Love What You See?', 'Your home could be our next favorite project. Let’s talk about your vision.')}`;
  pages['/our-work/'] = layout({
    title: 'Our Work | Interior Design Portfolio — Colorado Springs | Interiors by JanLee',
    description: `Browse ${projects.length} interior design and remodeling projects by Interiors by JanLee: kitchens, bathrooms, bedrooms, living rooms, whole-home makeovers and salons in Colorado Springs.`,
    url: '/our-work/', body, ogImage: '/assets/img/og/timeless-open-navy-blue-kitchen.jpg',
    ld: [breadcrumb([['/', 'Home'], ['/our-work/', 'Our Work']]),
      { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Our Work', url: site.url + '/our-work/',
        mainEntity: { '@type': 'ItemList', itemListElement: projects.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: site.url + p.url, name: p.name })) } }],
  });
}

// PROJECT PAGES
projects.forEach((p, idx) => {
  const prev = projects[(idx - 1 + projects.length) % projects.length];
  const next = projects[(idx + 1) % projects.length];
  const related = projects.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 3);
  const cover = p.photos[0];
  const base = `/assets/img/projects/${p.slug}`;
  const desc = p.description || p.summary;
  const metaDesc = (desc.length > 155 ? desc.slice(0, 152).replace(/\s+\S*$/, '') + '…' : desc);
  const crumbs = [['/', 'Home'], ['/our-work/', 'Our Work'], [p.url, p.name]];
  const body = `
<section class="proj-hero">
  <div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><ol>${crumbs.map(([u, n], i) => i === 2 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${u}">${n}</a></li>`).join('')}</ol></nav>
    <div class="proj-head">
      <div>
        <p class="eyebrow">${esc(catLabel(p.cat))}</p>
        <h1 class="h1">${esc(p.name)}</h1>
        <ul class="proj-facts"><li>${icon('pin')} ${site.city}, ${site.region}</li><li>${icon('camera')} ${p.photos.length} photos</li><li>${icon('award')} Interiors by JanLee</li></ul>
      </div>
      <a class="btn btn-dark" href="/contact/">Start a Similar Project ${icon('arrow')}</a>
    </div>
  </div>
  <div class="wrap"><button class="proj-cover" type="button" data-open="0" aria-label="Open photo gallery">
    <picture>
      ${p.coverLg ? `<source media="(min-width: 768px)" srcset="${base}/cover-lg.webp ${p.coverLg[0]}w, ${base}/${cover.name}.webp ${cover.w}w" sizes="(min-width: 1280px) 1200px, 100vw">` : ''}
      <img src="${base}/${cover.name}-sm.webp" width="${cover.tw}" height="${cover.th}" alt="${esc(p.name)} — cover photo, interior design by Interiors by JanLee, Colorado Springs" fetchpriority="high">
    </picture>
    <span class="proj-cover-cta">${icon('grid')} View all ${p.photos.length} photos</span>
  </button></div>
</section>
<section class="section section-top0"><div class="wrap proj-body">
  <div class="prose proj-desc">
    <h2 class="h3">About this project</h2>
    ${paras(desc)}
  </div>
  <aside class="proj-aside">
    <p class="eyebrow">Inspired?</p>
    <p>Let’s design a space you’ll love just as much.</p>
    <a class="btn btn-dark btn-block" href="/contact/">Book a Consultation</a>
    <a class="btn btn-outline btn-block" href="${site.phoneHref}">${icon('phone')} ${site.phone}</a>
  </aside>
</div></section>
<section class="section section-tint" aria-labelledby="gal-h"><div class="wrap">
  <h2 class="h3" id="gal-h">Project Gallery</h2>
  <div class="gallery">${p.photos.map((ph, i) => `<button type="button" class="g-item" data-open="${i}" data-src="${base}/${ph.name}.webp" data-w="${ph.w}" data-h="${ph.h}" aria-label="Open photo ${i + 1} of ${p.photos.length}"><img src="${base}/${ph.name}-sm.webp" width="${ph.tw}" height="${ph.th}" alt="${esc(p.name)} — photo ${i + 1} of ${p.photos.length}" loading="lazy" decoding="async"></button>`).join('')}</div>
</div></section>
<nav class="wrap proj-nav" aria-label="More projects">
  <a href="${prev.url}" class="proj-nav-link">${icon('arrowL')}<span><small>Previous project</small>${esc(prev.name)}</span></a>
  <a href="/our-work/" class="icon-btn round" aria-label="All projects">${icon('grid')}</a>
  <a href="${next.url}" class="proj-nav-link proj-nav-next"><span><small>Next project</small>${esc(next.name)}</span>${icon('arrow')}</a>
</nav>
${related.length ? `<section class="section"><div class="wrap"><div class="section-head"><div>${sectionHead('Related', `More ${esc(catLabel(p.cat))}`)}</div><a class="link-arrow" href="/our-work/">All projects ${icon('arrow')}</a></div>
<div class="card-grid">${related.map(r => projectCard(r, { sizes: '(min-width: 1100px) 33vw, (min-width: 640px) 50vw, 100vw' })).join('')}</div></div></section>` : ''}
${ctaBand()}
<dialog class="lightbox" aria-label="${esc(p.name)} photo viewer">
  <div class="lb-top"><span class="lb-count" aria-live="polite"></span><button class="icon-btn lb-close" type="button" aria-label="Close">${icon('close')}</button></div>
  <button class="icon-btn round lb-prev" type="button" aria-label="Previous photo">${icon('arrowL')}</button>
  <figure class="lb-fig"><img class="lb-img" alt=""><figcaption class="lb-cap">${esc(p.name)}</figcaption></figure>
  <button class="icon-btn round lb-next" type="button" aria-label="Next photo">${icon('arrow')}</button>
</dialog>`;
  pages[p.url] = layout({
    title: `${p.name} | ${catLabel(p.cat)} Design in Colorado Springs | Interiors by JanLee`,
    description: metaDesc, url: p.url, body, ogImage: `/assets/img/og/${p.slug}.jpg`, bodyClass: 'project',
    ld: [breadcrumb(crumbs), {
      '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.name, description: desc, url: site.url + p.url,
      creator: { '@id': site.url + '/#business' }, locationCreated: { '@type': 'Place', name: 'Colorado Springs, CO' },
      image: p.photos.slice(0, 10).map(ph => `${site.url}${base}/${ph.name}.webp`),
    }],
  });
});

// TESTIMONIALS
{
  const body = `
${pageHero('Testimonials', 'What Our Clients Are Saying', '', [['/', 'Home'], ['/testimonials/', 'Testimonials']], 'clean-living')}
<section class="section section-top0"><div class="wrap">
  <div class="rating-summary reveal">
    <div><strong>5.0</strong>${stars()}<span>${reviews.length} five-star reviews on Houzz</span></div>
    <div class="trust-badges">${badges.map(y => `<img src="/assets/img/badges/best-of-houzz-${y}.png" width="56" height="56" alt="Best of Houzz ${y}" loading="lazy">`).join('')}</div>
  </div>
  <div class="review-masonry">${reviews.map(r => reviewCard(r)).join('')}</div>
</div></section>
${ctaBand('Become Our Next Happy Client')}`;
  pages['/testimonials/'] = layout({
    title: `Client Reviews & Testimonials | ${reviews.length} Five-Star Reviews | Interiors by JanLee`,
    description: `Read ${reviews.length} five-star reviews from Colorado Springs homeowners about working with JanLee — 8× Best of Houzz for client satisfaction.`,
    url: '/testimonials/', body, ld: [breadcrumb([['/', 'Home'], ['/testimonials/', 'Testimonials']])],
  });
}

// CONTACT
{
  const opts = ['Interior design & decorating', 'Kitchen renovation', 'Bathroom renovation', 'Whole-home remodel', 'Color consultation', 'Furniture selection / repurposing', 'Commercial space', 'Something else'];
  const body = `
${pageHero('Contact', 'Start Your Project Today', 'Questions? Ideas? Drop us a line — we’ll reach out within 1 business day.', [['/', 'Home'], ['/contact/', 'Contact']], 'spacious-living')}
<section class="section section-top0"><div class="wrap contact-grid">
  <div class="contact-info">
    <h2 class="h3">Let’s Connect</h2>
    <ul class="contact-list">
      <li><span class="ci">${icon('phone')}</span><span><small>Call</small><a href="${site.phoneHref}">${site.phone}</a></span></li>
      <li><span class="ci">${icon('mail')}</span><span><small>Email</small><a href="mailto:${site.email}">${site.email}</a></span></li>
      <li><span class="ci">${icon('pin')}</span><span><small>Studio</small>${site.city}, Colorado</span></li>
    </ul>
    <div class="map"><iframe title="Map of Colorado Springs, CO" src="https://www.google.com/maps?q=Colorado+Springs,+CO&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
  </div>
  <form class="form" id="contact-form" data-endpoint="${esc(site.formEndpoint)}" data-email="${site.email}" data-tel="${site.phoneHref}" data-phone="${site.phone}" novalidate>
    <h2 class="h3">Schedule Your Consultation</h2>
    <input type="hidden" name="_subject" value="New website inquiry — Interiors by JanLee">
    <input type="hidden" name="_template" value="table">
    <input type="hidden" name="_captcha" value="false">
    <input type="hidden" name="_autoresponse" value="${esc(site.autoresponse)}">
    <input type="hidden" name="_blacklist" value="casino, crypto, bitcoin, viagra, loan offer, seo services, backlinks, forex">
    <p class="hp" aria-hidden="true"><label>Leave this field empty<input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></p>
    <div class="form-row">
      <label><span class="lbl">Name <span aria-hidden="true">*</span></span><input name="name" autocomplete="name" required minlength="2" maxlength="80" aria-describedby="err-name"><small class="field-err" id="err-name"></small></label>
      <label><span class="lbl">Email <span aria-hidden="true">*</span></span><input name="email" type="email" autocomplete="email" inputmode="email" required maxlength="254" spellcheck="false" aria-describedby="err-email"><small class="field-err" id="err-email"></small></label>
    </div>
    <div class="form-row">
      <label><span class="lbl">Phone <span aria-hidden="true">*</span></span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="20" placeholder="(719) 555-0123" aria-describedby="err-phone"><small class="field-err" id="err-phone"></small></label>
      <label><span class="lbl">Zip code</span><input name="zip" inputmode="numeric" autocomplete="postal-code" maxlength="10" aria-describedby="err-zip"><small class="field-err" id="err-zip"></small></label>
    </div>
    <label><span class="lbl">Project type</span><select name="project">${opts.map(o => `<option>${o}</option>`).join('')}</select></label>
    <label><span class="lbl">Tell us about your project <span aria-hidden="true">*</span></span><textarea name="message" rows="5" required minlength="10" maxlength="2000" aria-describedby="err-message msg-count"></textarea><span class="field-meta"><small class="field-err" id="err-message"></small><small class="field-count" id="msg-count" aria-live="polite">0 / 2000</small></span></label>
    <p class="form-note">We care about your privacy. Please don’t submit sensitive information such as social security numbers, credit card or bank information.</p>
    <label class="check"><input type="checkbox" name="consent" required aria-describedby="err-consent"> <span>I agree that Interiors by JanLee can email and call me in response to my inquiry.</span></label><small class="field-err" id="err-consent"></small>
    <button class="btn btn-dark btn-block" type="submit">Send Message ${icon('arrow')}</button>
    <p class="form-status" role="status" aria-live="polite"></p>
  </form>
</div></section>`;
  pages['/contact/'] = layout({
    title: 'Contact Interiors by JanLee | Book a Design Consultation in Colorado Springs',
    description: `Schedule your interior design consultation with Interiors by JanLee in Colorado Springs. Call ${site.phone} or email ${site.email}. We respond within 1 business day.`,
    url: '/contact/', body, ld: [breadcrumb([['/', 'Home'], ['/contact/', 'Contact']])],
  });
}

// PRIVACY
pages['/privacy/'] = layout({
  title: 'Privacy Policy | Interiors by JanLee', description: 'Privacy policy for interiorsbyjanlee.com.', url: '/privacy/',
  body: `${pageHero('Legal', 'Privacy Policy', '', [['/', 'Home'], ['/privacy/', 'Privacy Policy']])}
<section class="section section-top0"><div class="wrap narrow prose">
<p>Interiors by JanLee respects your privacy. This page explains what information we collect through this website and how we use it.</p>
<h2 class="h3">Information you provide</h2><p>When you contact us, we receive the details you choose to share — such as your name, email address, phone number, zip code and project details. We use this information only to respond to your inquiry and to provide our design services.</p>
<h2 class="h3">Cookies & third parties</h2><p>This site does not use advertising cookies. The map on our contact page is provided by Google Maps, and fonts are provided by Google Fonts; these services may collect technical information under their own privacy policies.</p>
<h2 class="h3">Sharing</h2><p>We do not sell or rent your personal information. We may share project details with trusted contractors only as needed to complete work you have requested.</p>
<h2 class="h3">Contact</h2><p>Questions about this policy? Email <a href="mailto:${site.email}">${site.email}</a> or call <a href="${site.phoneHref}">${site.phone}</a>.</p>
</div></section>`,
});

// 404
const notFound = layout({
  title: 'Page Not Found | Interiors by JanLee', description: 'The page you are looking for could not be found.', url: '/404.html',
  body: `<section class="section"><div class="wrap narrow center"><p class="eyebrow">404</p><h1 class="h1">This room is still being designed.</h1><p class="lead">The page you’re looking for has moved or no longer exists.</p><div class="btn-row center-row"><a class="btn btn-dark" href="/">Back to Home</a><a class="btn btn-outline" href="/our-work/">View Our Work</a></div></div></section>`,
}).replace('<meta name="robots" content="index, follow, max-image-preview:large">', '<meta name="robots" content="noindex">');

// ---------- write ----------
for (const [url, html] of Object.entries(pages)) {
  const dir = path.join(OUT, url);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}
fs.writeFileSync(path.join(OUT, '404.html'), notFound);
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${Object.keys(pages).filter(u => u !== '/privacy/').map(u => {
  const p = projects.find(x => x.url === u);
  const imgs = p ? p.photos.slice(0, 20).map(ph => `<image:image><image:loc>${site.url}/assets/img/projects/${p.slug}/${ph.name}.webp</image:loc></image:image>`).join('') : '';
  return `<url><loc>${site.url}${u}</loc><lastmod>${today}</lastmod><priority>${u === '/' ? '1.0' : p ? '0.7' : '0.8'}</priority>${imgs}</url>`;
}).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, 'site.webmanifest'), JSON.stringify({ name: site.name, short_name: 'JanLee', start_url: '/', display: 'standalone', background_color: '#F7F2EA', theme_color: '#F7F2EA', icons: [{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: '/assets/img/brand/icon-512.png', sizes: '512x512', type: 'image/png' }] }, null, 1));
fs.writeFileSync(path.join(ROOT, 'build', 'og-list.json'), JSON.stringify(projects.map(p => ({ slug: p.slug, name: p.photos[0].name }))));
console.log(`Built ${Object.keys(pages).length} pages, ${projects.length} projects, ${totalPhotos} photos, ${reviews.length} reviews.`);
