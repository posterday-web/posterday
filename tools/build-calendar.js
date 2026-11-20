// Writes calendar.ics, the Posterday calendar that people subscribe to, from shows.js.
// Run with: node tools/build-calendar.js
// A GitHub Action runs this for you whenever shows.js changes, so you don't need to.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { ics } = require("../calendar.js");

const root = path.join(__dirname, "..");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "shows.js"), "utf8"), sandbox);
const { SHOWS, UPDATED } = sandbox.window;

// Use the "updated" date in shows.js as the timestamp, so the file only changes when the shows do.
const updated = new Date(UPDATED + " 12:00 UTC");
const stamp = (isNaN(updated) ? new Date() : updated).toISOString().slice(0, 10).replace(/-/g, "") + "T000000Z";

fs.writeFileSync(path.join(root, "calendar.ics"), ics(SHOWS, { feed: true, stamp }));
console.log("calendar.ics: " + SHOWS.filter(s => s.start).length + " shows with dates");
