#!/usr/bin/env node
// Builds the pages Google can find: one page per show, one per region and one per subject,
// plus sitemap.xml. Everything is made from shows.js, so edit the shows there and run:
//   node tools/build-pages.js
// A GitHub Action runs this automatically whenever shows.js changes, and once a week.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://posterday.com";
const OG_IMAGE = SITE + "/img/og-image.png";

global.window = {};
require(path.join(ROOT, "shows.js"));
const SHOWS = window.SHOWS, UPDATED = window.UPDATED;

const TYPES = {degree:"Degree show", project:"Project show", national:"National showcase", london:"London / LDF show"};
const TYPE_COL = {degree:"var(--c1)", project:"var(--c3)", national:"var(--c2)", london:"var(--c4)"};
const SUBJECTS = {product:"Product & Furniture", interiors:"Interiors & Architecture", graphics:"Graphics & Illustration", fashion:"Fashion & Textiles", fineart:"Fine Art", media:"Photography, Film & Animation", craft:"Jewellery, Ceramics & Craft", performance:"Theatre & Performance Design"};
// Lower-case phrases used in page titles, e.g. "Fashion degree shows".
const SUBJECT_PHRASE = {product:"product and furniture design", interiors:"interior design and architecture", graphics:"graphic design and illustration", fashion:"fashion and textiles", fineart:"fine art", media:"photography, film and animation", craft:"jewellery, ceramics and craft", performance:"theatre and performance design"};
const MK = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MFULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const TODAY = new Date().toISOString().slice(0, 10);
const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const slugify = t => String(t).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "")
  .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const fmt = d => { const [, m, dd] = d.split("-"); return parseInt(dd, 10) + " " + MK[parseInt(m, 10) - 1]; };
const fmtLong = d => { const [y, m, dd] = d.split("-"); return parseInt(dd, 10) + " " + MFULL[parseInt(m, 10) - 1] + " " + y; };
function dateText(s) {
  if (s.dates) return s.dates;
  if (!s.start) return "Dates to be confirmed";
  if (!s.end || s.end === s.start) return fmt(s.start) + " " + s.start.slice(0, 4);
  return fmt(s.start) + " – " + fmt(s.end) + " " + s.end.slice(0, 4);
}
const isOver = s => s.start && (s.end || s.start) < TODAY;
const clip = (t, n) => t.length <= n ? t : t.slice(0, n - 1).replace(/[\s,.;:]+\S*$/, "") + "…";

// ---------- Give every show a clear name and a stable, unique address ----------
// Many shows have names like "Undergraduate Degree Show", so add the university when the
// name doesn't already say whose show it is. Years are left out so the address stays the
// same from one year to the next.
const STOP = new Set(["the","of","for","and","university","college","school","art","arts","london","design","creative","engineering","&"]);
function label(s) {
  const name = s.name.replace(/^RCA20\d\d\b/, "RCA").replace(/\s*\b20\d\d\b\s*/g, " ").replace(/^[\s:–-]+|[\s:–-]+$/g, "").replace(/\s{2,}/g, " ");
  if (s.type === "national") return name;
  const parts = s.inst.replace(/\s*×.*$/, "").split(",").map(t => t.trim());
  const instMain = parts[0];
  const lname = name.toLowerCase();
  const words = parts.join(" ").split(/\s+/).map(w => w.toLowerCase()).filter(w => w && !STOP.has(w));
  const acronyms = parts.map(p => p.replace(/^The\s+/, "").split(/\s+/).filter(w => /^[A-Z]/.test(w)).map(w => w[0]).join(""))
    .concat(parts.filter(p => /^[A-Z]{2,5}$/.test(p)));
  const known = words.some(w => lname.includes(w)) || acronyms.some(a => a.length > 1 && new RegExp("\\b" + a + "\\b").test(name));
  if (known) return name;
  return /^(Undergraduate|Undergrad|Degree|Showcase|Annual|Art|BA|MA|End of|Graduate|School of|Product Design)\b/.test(name)
    ? `${instMain} ${name}` : `${name}, ${instMain}`;
}
const used = new Set();
for (const s of SHOWS) {
  s.label = label(s);
  let slug = slugify(s.label);
  let n = 2, base = slug;
  while (used.has(slug)) slug = base + "-" + n++;
  used.add(slug);
  s.slug = slug;
  s.path = "/shows/" + slug + "/";
}
const regionPath = r => "/region/" + slugify(r) + "/";
const subjectPath = k => "/subject/" + slugify(SUBJECTS[k]) + "/";
const REGIONS = [...new Set(SHOWS.map(s => s.region))].sort();
const byDate = (a, b) => (a.start || "9999").localeCompare(b.start || "9999") || a.name.localeCompare(b.name);

// ---------- Shared page shell ----------
function page({title, description, canonical, body, jsonld, ogType = "website", scripts = ""}) {
  const ld = (jsonld || []).map(o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${canonical}">
<meta property="og:site_name" content="Posterday">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Posterday: UK art and design degree shows">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/site.css?v=4">
<link rel="stylesheet" href="/pages.css?v=1">
${ld}
<!-- Private view analytics (GoatCounter). The dashboard is at https://posterday.goatcounter.com and needs a login. -->
<script data-goatcounter="https://posterday.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>
</head>
<body>
<header class="topbar">
  <div class="wrap">
    <a class="brand" href="/">Posterday</a>
    <span class="divider"></span>
    <span class="tagline">UK art and design degree shows and project shows</span>
    <nav><a href="/#shows">All shows</a><a href="${scripts ? "#remind" : "/#remind"}">Get reminders</a><a href="/advertise.html">Advertise</a></nav>
  </div>
</header>
<main>
${body}
${browseFooter()}
</main>
<script>
// Count clicks on a show's official link, like on the home page.
document.addEventListener("click", e=>{
  const a = e.target.closest("a[data-show]");
  if(!a || !window.goatcounter || !window.goatcounter.count) return;
  window.goatcounter.count({path: "show/" + a.dataset.show, title: a.dataset.show + " (" + a.dataset.where + ")", event: true});
});
</script>
${scripts}
</body>
</html>
`;
}

function browseFooter() {
  return `<footer class="wrap browse">
  <div><h3>Shows by region</h3><ul>${REGIONS.map(r => `<li><a href="${regionPath(r)}">${esc(r)}</a></li>`).join("")}</ul></div>
  <div><h3>Shows by subject</h3><ul>${Object.keys(SUBJECTS).map(k => `<li><a href="${subjectPath(k)}">${esc(SUBJECTS[k])}</a></li>`).join("")}</ul></div>
  <div><h3>Posterday</h3><ul><li><a href="/">All UK degree shows</a></li><li><a href="/advertise.html">Advertise your show</a></li></ul>
  <p>Dates come from each university's or organiser's own pages. Always check the official link before you travel. Updated ${esc(UPDATED)}.</p></div>
</footer>`;
}

function crumbs(items) {
  const html = `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([name, href], i) =>
    i < items.length - 1 ? `<a href="${href}">${esc(name)}</a><span>/</span>` : `<span aria-current="page">${esc(name)}</span>`).join("")}</nav>`;
  const ld = {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":items.map(([name, href], i) =>
    ({"@type":"ListItem","position":i + 1,"name":name,"item":SITE + href}))};
  return [html, ld];
}

// A compact card linking to a show's own page.
function miniCard(s) {
  return `<article class="card">
    <div class="head"><div><h4><a class="title" href="${s.path}">${esc(s.label)}</a></h4><div class="inst">${esc(s.inst)}</div></div>
      <span class="tag"><i style="background:${TYPE_COL[s.type]}"></i>${TYPES[s.type]}</span></div>
    <div class="dates">${esc(dateText(s))}</div>
    <dl><dt>Where</dt><dd>${esc(s.city)}</dd></dl>
    <a class="link" href="${s.path}">Dates, venue and courses →</a>
  </article>`;
}

// The email sign-up and calendar subscribe box, as on the home page. remind.js makes it work.
function signupSection() {
  return `<div class="contact remind" id="remind">
    <div>
      <h2>Never miss a show</h2>
      <p>Most dates are announced in spring. Leave your email and we'll tell you when they're out, with a note before the busy season starts. No spam, and you can unsubscribe at any time.</p>
      <div class="subcal">
        <b>Or add every show to your calendar.</b> New dates appear in it by themselves as we add them.
        <div class="btns">
          <a class="btn" id="subApple" href="#" data-subscribe="apple">Apple or Outlook</a>
          <a class="btn" id="subGoogle" href="#" target="_blank" rel="noopener" data-subscribe="google">Google Calendar</a>
          <button class="btn" type="button" id="subCopy" data-subscribe="copy">Copy calendar link</button>
        </div>
      </div>
    </div>
    <form id="signup" novalidate>
      <input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <input type="hidden" name="show" id="signupShow">
      <p class="signup-for" id="signupFor" hidden></p>
      <label>Your email<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
      <div class="btns"><button class="btn solid" type="submit">Remind me</button></div>
      <div class="note" id="signupStatus" aria-live="polite"></div>
    </form>
  </div>`;
}

// ---------- One page per show ----------
function eventJson(s) {
  if (!s.start) return null;
  const ev = {
    "@context": "https://schema.org",
    "@type": "ExhibitionEvent",
    "name": s.label,
    "description": `${TYPES[s.type]} from ${s.inst}. ${s.courses}.`,
    "startDate": s.start,
    "endDate": s.end || s.start,
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {
      "@type": "Place",
      "name": s.city.split(",")[0],
      "address": {"@type": "PostalAddress", "streetAddress": s.city, "addressRegion": s.region, "addressCountry": "GB"}
    },
    "organizer": {"@type": "Organization", "name": s.inst.split(",").slice(-1)[0].trim() || s.inst, ...(s.url ? {"url": s.url} : {})},
    "image": [OG_IMAGE],
    "url": SITE + s.path
  };
  return ev;
}

function showPage(s) {
  const over = isOver(s);
  const nextYear = s.start ? String(parseInt(s.start.slice(0, 4), 10) + 1) : "";
  const subjNames = s.subjects.map(k => SUBJECTS[k]);
  const title = over
    ? `${s.label} ${nextYear}: dates and venue · Posterday`
    : `${s.label} ${s.start ? s.start.slice(0, 4) + " " : ""}dates and venue · Posterday`;
  const when = s.start
    ? (s.end && s.end !== s.start ? `${fmtLong(s.start)} to ${fmtLong(s.end)}` : fmtLong(s.start))
    : "Dates to be confirmed";
  const description = clip(over
    ? `${s.label}. Last held ${when} at ${s.city}. ${nextYear} guide: ${s.next}. Courses: ${s.courses}.`
    : `${s.label}. ${s.dates || when}, ${s.city}. Courses: ${s.courses}.`, 158);

  const sameRegion = SHOWS.filter(o => o !== s && o.region === s.region).sort(byDate).slice(0, 6);
  const [crumbHtml, crumbLd] = crumbs([["All shows", "/"], [s.region, regionPath(s.region)], [s.label, s.path]]);

  const body = `<section class="wrap intro show-page">
  ${crumbHtml}
  <p class="meta">${TYPES[s.type]} · ${esc(s.region)}</p>
  <h1>${esc(s.label)}</h1>
  <p class="lede">${esc(s.inst)}</p>
  <div class="show-detail">
    <div class="card">
      <div class="dates">${esc(dateText(s))}</div>
      <dl>
        <dt>Where</dt><dd>${esc(s.city)}</dd>
        <dt>Region</dt><dd><a href="${regionPath(s.region)}">${esc(s.region)}</a></dd>
        <dt>Type</dt><dd><span class="tag"><i style="background:${TYPE_COL[s.type]}"></i>${TYPES[s.type]}</span></dd>
        <dt>Courses</dt><dd>${esc(s.courses)}</dd>
      </dl>
      <div class="subj">${s.subjects.map(k => `<a href="${subjectPath(k)}">${esc(SUBJECTS[k])}</a>`).join("")}</div>
      <div class="next"><b>${over ? nextYear + " guide" : "Usually"}:</b> ${esc(s.next)}</div>
      <div class="actions">${s.url
        ? `<a class="link big" href="${esc(s.url)}" target="_blank" rel="noopener" data-show="${esc(s.name)}" data-where="show-page">Official page →</a>`
        : `<span class="none">Search "${esc(s.name)} ${esc(s.inst.split(",")[0])}" for this year's line-up</span>`}
      <span data-remind-slot="${esc(s.name)}"></span></div>
    </div>
    <div class="about">
      <h2>About this show</h2>
      <p>${esc(s.name)} is ${s.type === "national" ? `a national graduate showcase (${esc(s.inst)})` : (s.type === "project" ? "a final-year project show" : s.type === "london" ? "a show held during London Design Festival" : "a final-year degree show") + " from " + esc(s.inst)}, held at ${esc(s.city)}. ${s.start ? `The ${s.start.slice(0, 4)} show ${over ? "ran" : "runs"} ${esc(when.replace(/^(\d)/, "from $1"))}.` : "Dates for this year have not been announced yet."}</p>
      <p>It covers ${esc(subjNames.join(", ").replace(/, ([^,]*)$/, " and $1"))}, with work from these courses: ${esc(s.courses)}.</p>
      <p>Most universities announce their dates in spring. Posterday updates this page when they do, but always check the official page before you travel.</p>
    </div>
  </div>
  ${signupSection()}
  ${sameRegion.length ? `<h2>More shows in ${esc(s.region)}</h2><div class="grid">${sameRegion.map(miniCard).join("")}</div>
  <p class="more"><a href="${regionPath(s.region)}">All ${SHOWS.filter(o => o.region === s.region).length} shows in ${esc(s.region)} →</a></p>` : ""}
</section>`;
  // "Add to calendar" and "Remind me" come from /remind.js, the same code the home page uses.
  const data = {name: s.name, inst: s.inst, city: s.city, courses: s.courses, url: s.url, start: s.start, end: s.end};
  const scripts = `<script>window.SHOWS = [${JSON.stringify(data).replace(/</g, "\\u003c")}];</script>
<script src="/calendar.js"></script>
<script src="/remind.js"></script>`;
  return page({title, description, canonical: s.path, body, ogType: "article", jsonld: [eventJson(s), crumbLd].filter(Boolean), scripts});
}

// ---------- Region and subject pages ----------
function listPage({h1, title, description, canonical, lede, shows, crumbName}) {
  const [crumbHtml, crumbLd] = crumbs([["All shows", "/"], [crumbName, canonical]]);
  const sorted = shows.slice().sort(byDate);
  const months = {};
  sorted.forEach(s => { const m = s.start ? MFULL[parseInt(s.start.slice(5, 7), 10) - 1] : "Dates to be confirmed"; (months[m] ||= []).push(s); });
  const body = `<section class="wrap intro">
  ${crumbHtml}
  <p class="meta">${shows.length} show${shows.length === 1 ? "" : "s"}, updated ${esc(UPDATED)}</p>
  <h1>${esc(h1)}</h1>
  <p class="lede">${esc(lede)}</p>
  ${Object.entries(months).map(([m, list]) => `<section class="month"><h2>${esc(m)} <span>${list.length} show${list.length === 1 ? "" : "s"}</span></h2><div class="grid">${list.map(miniCard).join("")}</div></section>`).join("")}
</section>`;
  const itemList = {"@context":"https://schema.org","@type":"ItemList","name":h1,
    "itemListElement": sorted.map((s, i) => ({"@type":"ListItem","position":i + 1,"url":SITE + s.path,"name":s.label}))};
  return page({title, description, canonical, body, jsonld: [itemList, crumbLd]});
}

function regionPage(r) {
  const shows = SHOWS.filter(s => s.region === r);
  const where = r === "North" ? "the North of England" : r === "East" ? "the East of England" : r === "Midlands" ? "the Midlands" : /^South/.test(r) ? "the " + r : r;
  const cities = [...new Set(shows.map(s => s.city.split(",").slice(-1)[0].trim().replace(/\s+[A-Z]{1,2}\d.*$/, "")))].slice(0, 5);
  return listPage({
    h1: `Degree shows in ${where}`,
    title: `Art and design degree shows in ${where} · Posterday`,
    description: clip(`All ${shows.length} art and design degree shows and graduate showcases in ${where}${cities.length ? ", including " + cities.join(", ") : ""}. Dates, venues, courses and links.`, 158),
    canonical: regionPath(r),
    lede: `Every art and design degree show, project show and graduate showcase Posterday lists in ${where}, in date order. Each show has its own page with dates, venue, courses and a guide to next year.`,
    shows, crumbName: r
  });
}

function subjectPage(k) {
  const shows = SHOWS.filter(s => s.subjects.includes(k));
  const phrase = SUBJECT_PHRASE[k];
  const cap = phrase.charAt(0).toUpperCase() + phrase.slice(1);
  return listPage({
    h1: `${cap} degree shows`,
    title: `${cap} degree shows in the UK · Posterday`,
    description: clip(`${shows.length} UK degree shows and graduate showcases with ${phrase}. Dates, venues and courses for each show, all in one place.`, 158),
    canonical: subjectPath(k),
    lede: `UK degree shows, project shows and graduate showcases where you can see ${phrase}. Big multi-subject shows are included when they have ${phrase} on display.`,
    shows, crumbName: SUBJECTS[k]
  });
}

// ---------- Write everything ----------
function write(rel, html) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, html);
}
// Start clean so renamed or removed shows don't leave old pages behind.
for (const dir of ["shows", "region", "subject"]) fs.rmSync(path.join(ROOT, dir), {recursive: true, force: true});

const urls = [{loc: "/", priority: "1.0"}, {loc: "/advertise.html", priority: "0.3"}];
for (const s of SHOWS) { write(s.path + "index.html", showPage(s)); urls.push({loc: s.path, priority: "0.8"}); }
for (const r of REGIONS) { write(regionPath(r) + "index.html", regionPage(r)); urls.push({loc: regionPath(r), priority: "0.7"}); }
for (const k of Object.keys(SUBJECTS)) {
  if (!SHOWS.some(s => s.subjects.includes(k))) continue;
  write(subjectPath(k) + "index.html", subjectPage(k)); urls.push({loc: subjectPath(k), priority: "0.7"});
}

write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u.loc}</loc><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`);

// Lets the home page link each card to its show page.
write("show-pages.js", "// Made by tools/build-pages.js from shows.js. Do not edit by hand.\nwindow.SHOW_PAGES = " + JSON.stringify(Object.fromEntries(SHOWS.map(s => [s.name, s.path])), null, 0).replace(/\",\"/g, "\",\n  \"") + ";\n");

console.log(`Built ${SHOWS.length} show pages, ${REGIONS.length} region pages, subject pages and sitemap.xml (${urls.length} URLs).`);
