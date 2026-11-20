// Builds calendar entries for shows. Used in the browser (the "Add to calendar" links on each card)
// and by tools/build-calendar.js, which writes calendar.ics: the calendar people can subscribe to.
(function (root) {
  const SITE = "https://posterday.com/";

  const slug = t => String(t).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const ymd = d => d.replace(/-/g, "");
  // Calendars treat an all-day event's end date as the day after it finishes.
  function dayAfter(d) {
    const t = new Date(d + "T12:00:00Z");
    t.setUTCDate(t.getUTCDate() + 1);
    return t.toISOString().slice(0, 10);
  }
  const hasDates = s => !!s.start;

  function details(s) {
    return [
      s.inst,
      s.courses ? "Courses: " + s.courses : "",
      s.url ? "Official page: " + s.url : "",
      "Check the official page before you travel. Listed on Posterday: " + SITE
    ].filter(Boolean).join("\n\n");
  }

  // Link that opens Google Calendar with the show filled in.
  function googleUrl(s) {
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: s.name,
      dates: ymd(s.start) + "/" + ymd(dayAfter(s.end || s.start)),
      details: details(s),
      location: s.city || ""
    });
    return "https://calendar.google.com/calendar/render?" + p.toString();
  }

  // iCalendar text needs some characters escaped and long lines folded.
  const icsText = t => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  function fold(line) {
    const out = [];
    let cur = "", bytes = 0;
    for (const ch of line) {
      const b = unescape(encodeURIComponent(ch)).length;
      if (bytes + b > 74) { out.push(cur); cur = " "; bytes = 1; }
      cur += ch; bytes += b;
    }
    out.push(cur);
    return out.join("\r\n");
  }

  function eventLines(s, stamp) {
    const lines = [
      "BEGIN:VEVENT",
      "UID:" + slug(s.name) + "-" + s.start + "@posterday.com",
      "DTSTAMP:" + stamp,
      "DTSTART;VALUE=DATE:" + ymd(s.start),
      "DTEND;VALUE=DATE:" + ymd(dayAfter(s.end || s.start)),
      "SUMMARY:" + icsText(s.name),
      "DESCRIPTION:" + icsText(details(s)),
      s.city ? "LOCATION:" + icsText(s.city) : "",
      s.url ? "URL:" + s.url : "",
      "TRANSP:TRANSPARENT",
      // A reminder at 9am the day before the show opens.
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:" + icsText(s.name + " opens tomorrow"),
      "TRIGGER:-PT15H",
      "END:VALARM",
      "END:VEVENT"
    ];
    return lines.filter(Boolean);
  }

  // stamp: when the file was made, as 20261120T000000Z.
  function ics(shows, opts) {
    opts = opts || {};
    const stamp = opts.stamp || new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const head = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Posterday//UK degree shows//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];
    if (opts.feed) head.push(
      "X-WR-CALNAME:Posterday: UK degree shows",
      "X-WR-CALDESC:UK art and design degree shows and project shows from " + SITE,
      "X-WR-TIMEZONE:Europe/London",
      "REFRESH-INTERVAL;VALUE=DURATION:P1D",
      "X-PUBLISHED-TTL:P1D"
    );
    const body = shows.filter(hasDates).flatMap(s => eventLines(s, stamp));
    return head.concat(body, ["END:VCALENDAR"]).map(fold).join("\r\n") + "\r\n";
  }

  const api = { googleUrl, ics, slug, hasDates };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PosterdayCalendar = api;
})(this);
