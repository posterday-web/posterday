// Lists shows the map can't place, and where every show lands.
// Usage: node tools/check-places.js        (only problems)
//        node tools/check-places.js --all  (every show)
const path = require("path");
global.window = {};
require(path.join(__dirname, "..", "shows.js"));
require(path.join(__dirname, "..", "places.js"));
const all = process.argv.includes("--all");
let missing = 0;
for (const s of window.SHOWS) {
  const p = window.placeShow(s);
  if (!p) { missing++; console.log("NOT PLACED  " + s.name + "  (" + s.city + ")"); }
  else if (all) console.log(p.map(n => n.toFixed(4)).join(", ").padEnd(20) + s.name + "  (" + s.city + ")");
}
console.log(`${window.SHOWS.length - missing} of ${window.SHOWS.length} shows placed on the map.`);
process.exitCode = missing ? 1 : 0;
