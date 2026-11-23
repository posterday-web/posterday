#!/usr/bin/env node
// Emails subscribers when shows get new dates, so nobody has to write or send anything by hand.
//
// It compares shows.js with announced.json (the dates subscribers have already been told about).
// Any show that is still to come and has new or changed dates goes into one email, sent to
// everyone on the Kit list. Then announced.json is updated so the same dates are never sent twice.
//
// A GitHub Action runs this every morning. It needs the Kit API key saved as the repository
// secret KIT_API_KEY. Without the key it only updates announced.json and sends nothing.
//
//   node tools/announce-dates.js            check, send and update announced.json
//   node tools/announce-dates.js --dry-run  print the email it would send; change nothing
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SITE = "https://posterday.com";
const STATE = path.join(ROOT, "announced.json");
const DRY = process.argv.includes("--dry-run");
const KEY = process.env.KIT_API_KEY || "";
const TODAY = new Date().toISOString().slice(0, 10);

function load(file) {
  const sandbox = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), "utf8"), sandbox);
  return sandbox.window;
}
const {SHOWS} = load("shows.js");
const PAGES = fs.existsSync(path.join(ROOT, "show-pages.js")) ? load("show-pages.js").SHOW_PAGES || {} : {};

const MK = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmt = d => parseInt(d.slice(8, 10), 10) + " " + MK[parseInt(d.slice(5, 7), 10) - 1];
function dateText(s) {
  if (s.dates) return s.dates;
  const end = s.end || s.start;
  return end === s.start ? fmt(s.start) + " " + s.start.slice(0, 4) : fmt(s.start) + " – " + fmt(end) + " " + end.slice(0, 4);
}
const esc = t => String(t).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const key = s => (s.start || "") + "/" + (s.end || s.start || "");

// What subscribers have been told so far: show name -> "start/end".
const told = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : null;
const now = Object.fromEntries(SHOWS.filter(s => s.start).map(s => [s.name, key(s)]));

function save() {
  if (DRY) return;
  const sorted = Object.fromEntries(Object.keys(now).sort().map(k => [k, now[k]]));
  fs.writeFileSync(STATE, JSON.stringify(sorted, null, 1) + "\n");
}

// When the key is set, check it works every run, so a wrong or expired key shows up as a failed run
// (GitHub emails a warning) instead of being found out only when dates need sending.
async function checkKey() {
  if (!KEY || DRY) return;
  const r = await fetch("https://api.kit.com/v4/account", {headers: {"Accept": "application/json", "X-Kit-Api-Key": KEY}});
  if (!r.ok) { console.error("The Kit API key didn't work (" + r.status + "). Replace the KIT_API_KEY secret with a new key from Kit."); process.exit(1); }
  console.log("Kit API key works.");
}

(async () => {
await checkKey();
if (!told) {
  // First run: remember today's dates without emailing anyone about them.
  save();
  console.log("Started announced.json with " + Object.keys(now).length + " shows. Nothing sent.");
  return;
}

const fresh = SHOWS
  .filter(s => s.start && (s.end || s.start) >= TODAY && told[s.name] !== key(s))
  .sort((a, b) => a.start.localeCompare(b.start));

if (!fresh.length) { save(); console.log("No new dates."); return; }

const moved = s => told[s.name] && told[s.name].split("/")[0].slice(0, 4) === s.start.slice(0, 4);
const subject = fresh.length === 1
  ? `${fresh[0].name}: ${dateText(fresh[0])}`
  : `New degree show dates: ${fresh.slice(0, 2).map(s => s.name).join(", ")}${fresh.length > 2 ? ` and ${fresh.length - 2} more` : ""}`;
const preview = `${fresh.length} show${fresh.length === 1 ? " has" : "s have"} new dates on Posterday.`;
const content = `<p><a href="${SITE}/"><img src="${SITE}/img/logo-email.png" alt="Posterday" width="240" style="display:block;width:240px;max-width:100%;height:auto;border:0"></a></p>
<p>${fresh.length === 1 ? "A show you can now plan for:" : "These shows have just announced their dates:"}</p>
${fresh.map(s => {
  const href = SITE + (PAGES[s.name] || "/");
  return `<p><strong><a href="${esc(href)}">${esc(s.name)}</a></strong>${moved(s) ? " (dates changed)" : ""}<br>
${esc(s.inst)}<br>
${esc(dateText(s))} · ${esc(s.city)}</p>`;
}).join("\n")}
<p>Each show's page on Posterday has an "Add to calendar" button and a link to the official page. Always check the official page before you travel.</p>
<p><a href="${SITE}/">See every UK degree show on Posterday</a></p>`;

console.log("Subject: " + subject + "\n\n" + content + "\n");
await send(subject, preview, content);
})().catch(e => { console.error(e); process.exit(1); });

async function send(subject, preview, content) {
  if (DRY) { console.log("Dry run: nothing sent, announced.json unchanged."); return; }
  if (!KEY) { console.log("No KIT_API_KEY secret yet, so nothing sent. Dates are marked as told."); save(); return; }
  const r = await fetch("https://api.kit.com/v4/broadcasts", {
    method: "POST",
    headers: {"Content-Type": "application/json", "Accept": "application/json", "X-Kit-Api-Key": KEY},
    body: JSON.stringify({
      subject, preview_text: preview, content,
      description: "Automatic new-dates email from Posterday (" + TODAY + ")",
      public: false,
      published_at: new Date().toISOString(),
      // Kit sends to the whole list when no filter is given.
      send_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    })
  });
  const text = await r.text();
  if (!r.ok) {
    // Leave announced.json alone so the same dates are tried again tomorrow, and fail the run
    // so GitHub emails a warning.
    console.error("Kit refused the email (" + r.status + "): " + text);
    process.exit(1);
  }
  console.log("Kit scheduled the email: " + text.slice(0, 300));
  save();
}
